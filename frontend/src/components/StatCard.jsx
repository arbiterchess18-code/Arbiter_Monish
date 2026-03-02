import { motion } from "framer-motion";

export function StatCard({ title, value, icon: Icon, trend, trendUp, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="stat-card group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-body">{title}</p>
          <p className="text-3xl font-display font-bold mt-1 text-foreground">{value}</p>
          {trend && (
            <p className={`text-xs mt-2 font-medium ${trendUp ? "text-success" : "text-destructive"}`}>
              {trend}
            </p>
          )}
        </div>
        <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
