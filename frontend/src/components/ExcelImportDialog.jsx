import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileSpreadsheet, Upload, AlertTriangle } from "lucide-react";

const REQUIRED_HEADERS = ["player name", "rating", "email"];

const normalizeHeader = (value) => value?.toString().trim().toLowerCase() || "";

// Minimal CSV parser with quote handling for common spreadsheet exports.
const parseCsvRows = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(field.trim());
      field = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field.trim());
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }

  return rows;
};

const toIsoDate = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
};

export function ExcelImportDialog({ isOpen, onClose, onSubmit }) {
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const parsedParticipants = useMemo(() => {
    return rows.map((row, idx) => ({
      serialNumber: row.serialNumber || String(idx + 1),
      playerName: row.playerName,
      rating: Number(row.rating || 0),
      email: row.email,
      registeredDate: toIsoDate(row.registeredDate),
    }));
  }, [rows]);

  const resetState = () => {
    setRows([]);
    setErrors([]);
    setLoading(false);
    setFileName("");
  };

  const handleDialogChange = (open) => {
    if (!open) {
      resetState();
      onClose();
    }
  };

  const readFileText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrors([]);
    setRows([]);
    setFileName(file.name);

    try {
      const text = await readFileText(file);
      const csvRows = parseCsvRows(text);

      if (csvRows.length < 2) {
        setErrors(["The file is empty or missing data rows."]);
        return;
      }

      const headers = csvRows[0].map(normalizeHeader);
      const missingHeaders = REQUIRED_HEADERS.filter(
        (required) => !headers.includes(required),
      );

      if (missingHeaders.length > 0) {
        setErrors([
          `Missing required column(s): ${missingHeaders.join(", ")}. Expected: Player Name, Rating, Email.`,
        ]);
        return;
      }

      const colIndex = {
        serialNumber:
          headers.indexOf("serial number") >= 0
            ? headers.indexOf("serial number")
            : headers.indexOf("serial no") >= 0
              ? headers.indexOf("serial no")
              : headers.indexOf("s.no") >= 0
                ? headers.indexOf("s.no")
                : -1,
        playerName: headers.indexOf("player name"),
        rating: headers.indexOf("rating"),
        email: headers.indexOf("email"),
        registeredDate:
          headers.indexOf("registered date") >= 0
            ? headers.indexOf("registered date")
            : headers.indexOf("registration date") >= 0
              ? headers.indexOf("registration date")
              : -1,
      };

      const validationErrors = [];
      const parsedRows = [];

      csvRows.slice(1).forEach((cells, index) => {
        const line = index + 2;
        const playerName = cells[colIndex.playerName]?.trim();
        const ratingRaw = cells[colIndex.rating]?.trim();
        const email = cells[colIndex.email]?.trim();

        if (!playerName && !ratingRaw && !email) {
          return;
        }

        if (!playerName) {
          validationErrors.push(`Row ${line}: Player Name is required.`);
        }

        const rating = Number(ratingRaw);
        if (!ratingRaw || Number.isNaN(rating) || rating < 0) {
          validationErrors.push(
            `Row ${line}: Rating must be a valid non-negative number.`,
          );
        }

        if (!email || !email.includes("@")) {
          validationErrors.push(`Row ${line}: Email is invalid.`);
        }

        parsedRows.push({
          serialNumber:
            colIndex.serialNumber >= 0
              ? cells[colIndex.serialNumber]?.trim()
              : "",
          playerName: playerName || "",
          rating: Number.isNaN(rating) ? 0 : rating,
          email: email || "",
          registeredDate:
            colIndex.registeredDate >= 0
              ? cells[colIndex.registeredDate]?.trim()
              : "",
        });
      });

      if (parsedRows.length === 0) {
        setErrors(["No valid participant rows found in this file."]);
        return;
      }

      if (validationErrors.length > 0) {
        setErrors(validationErrors.slice(0, 15));
        return;
      }

      setRows(parsedRows);
    } catch (error) {
      setErrors([error.message || "Unable to parse file."]);
    }
  };

  const handleDownloadTemplate = () => {
    const template =
      "Serial Number,Player Name,Rating,Email,Registered Date\n" +
      "1,John Doe,1650,john@example.com,2026-03-15\n";
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "participant_import_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (parsedParticipants.length === 0) {
      setErrors(["Upload and validate a file before importing."]);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      await onSubmit(parsedParticipants);
      resetState();
    } catch (error) {
      setErrors([error.message || "Import failed."]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import Participants
          </DialogTitle>
          <DialogDescription>
            Upload a CSV exported from Excel with columns: Serial Number, Player
            Name, Rating, Email, Registered Date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="grid w-full max-w-sm items-center gap-2">
              <Label htmlFor="participant-file">CSV File</Label>
              <Input
                id="participant-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadTemplate}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>

          {fileName ? (
            <p className="text-sm text-muted-foreground">
              Selected file: <span className="font-medium">{fileName}</span>
            </p>
          ) : null}

          {errors.length > 0 ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                Validation errors
              </div>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {parsedParticipants.length > 0 ? (
            <div className="border rounded-md max-h-[320px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Player Name</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Registered Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedParticipants.map((participant, idx) => (
                    <TableRow key={`${participant.email}-${idx}`}>
                      <TableCell>
                        {participant.serialNumber || idx + 1}
                      </TableCell>
                      <TableCell>{participant.playerName}</TableCell>
                      <TableCell>{participant.rating}</TableCell>
                      <TableCell>{participant.email}</TableCell>
                      <TableCell>{participant.registeredDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDialogChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={loading || parsedParticipants.length === 0}
          >
            <Upload className="w-4 h-4 mr-2" />
            {loading
              ? "Importing..."
              : `Import ${parsedParticipants.length || ""} Participant${parsedParticipants.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
