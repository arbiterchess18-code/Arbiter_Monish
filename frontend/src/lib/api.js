const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

export const apiFetch = async (url, options = {}) => {
    const token = sessionStorage.getItem("token");
    const mergedOptions = {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    };

    let response = await fetch(url, mergedOptions);

    if (response.status === 401 && !url.includes("/token") && !url.includes("/signup") && !url.includes("/auth/refresh")) {
        if (isRefreshing) {
            return new Promise(function (resolve, reject) {
                failedQueue.push({ resolve, reject });
            })
                .then(() => {
                    return fetch(url, mergedOptions);
                })
                .catch((err) => {
                    return Promise.reject(err);
                });
        }

        isRefreshing = true;

        try {
            const refreshResponse = await fetch(`${API_URL}/refresh`, {
                method: "POST",
                credentials: "include",
            });

            if (refreshResponse.ok) {
                processQueue(null);
                response = await fetch(url, mergedOptions);
            } else {
                processQueue(new Error("Session expired"), null);
                sessionStorage.removeItem("userData");
                window.dispatchEvent(new Event("authChange"));
                window.location.href = "/login?expired=true";
            }
        } catch (refreshErr) {
            processQueue(refreshErr, null);
            sessionStorage.removeItem("userData");
            window.dispatchEvent(new Event("authChange"));
            window.location.href = "/login?expired=true";
        } finally {
            isRefreshing = false;
        }
    }

    return response;
};
