import React, { useMemo, useState } from "react";
import { parse as parseTunx } from "@echecs/tunx";
import { useParams } from "react-router-dom";
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
import { Upload, AlertTriangle, FileSpreadsheet, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

// Parses player records (lines starting with '001 ') in standard FIDE TRF16 format
const parseTRFRows = (text, tournamentId) => {
  const lines = text.split(/\r?\n/);
  const participants = [];
  const errors = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (!line.startsWith("001 ")) return;

    // Fixed-width extraction from FIDE TRF16 spec
    try {
      // 1. Starting Rank / Seed (col 5-8, which is index 4-8)
      const seedRaw = line.slice(4, 8).trim();
      const seed = parseInt(seedRaw, 10);
      if (isNaN(seed)) {
        errors.push(`Row ${lineNumber}: Invalid starting rank (seed).`);
        return;
      }

      // 2. Sex/Gender (col 10, index 9)
      const sex = line.slice(9, 10).trim().toLowerCase();

      // 3. Title (col 11-13, index 10-13)
      const title = line.slice(10, 13).trim().toUpperCase();

      // 4. Name (col 15-47, index 14-47)
      const name = line.slice(14, 47).trim();
      if (!name) {
        errors.push(`Row ${lineNumber}: Player name is missing.`);
        return;
      }

      // 5. Rating (col 49-52, index 48-52)
      const ratingRaw = line.slice(48, 52).trim();
      const rating = parseInt(ratingRaw, 10) || 0;

      // 6. Federation (col 54-56, index 53-56)
      const fed = line.slice(53, 56).trim().toUpperCase();

      // 7. FIDE ID (col 58-68, index 57-68)
      const fideId = line.slice(57, 68).trim();

      // Generate unique stable dummy email address for onsite registrations
      let email = "";
      if (fideId && fideId.length > 3) {
        email = `fide_${fideId}@chaduranga-onsite.com`;
      } else {
        const cleanName = name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 12);
        email = `onsite_${cleanName || "player"}_${seed}_${tournamentId}@chaduranga-onsite.com`;
      }

      participants.push({
        playerName: name,
        email: email,
        rating: rating,
        fideId: fideId || "",
        seed: seed,
        gender: sex || "",
        title: title || "",
        federation: fed || "IND",
        registeredDate: new Date().toISOString().slice(0, 10),
      });
    } catch (e) {
      errors.push(`Row ${lineNumber}: Error parsing player record - ${e.message}`);
    }
  });

  return { participants, errors };
};

const toIsoDate = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
};

export function ParticipantImportDialog({ isOpen, onClose, onSubmit }) {
  const { id: tournamentId } = useParams();
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState(""); // "csv" or "trf"

  const resetState = () => {
    setRows([]);
    setErrors([]);
    setLoading(false);
    setFileName("");
    setFileType("");
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

  const readFileBuffer = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrors([]);
    setRows([]);
    setFileName(file.name);

    try {
      const isTUNX = file.name.toLowerCase().endsWith(".tunx");

      if (isTUNX) {
        setFileType("tunx");
        const arrayBuffer = await readFileBuffer(file);
        const buffer = new Uint8Array(arrayBuffer);
        const tournament = parseTunx(buffer);

        if (!tournament) {
          setErrors(["Failed to parse Swiss Manager .TUNX file. The file might be corrupted or in an unsupported format."]);
          return;
        }

        if (!tournament.players || tournament.players.length === 0) {
          setErrors(["No players found in this Swiss Manager .TUNX file."]);
          return;
        }

        const parsedRows = tournament.players.map((player, idx) => {
          const name = player.name || "";
          const fideId = player.fideId || "";
          const rating = player.rating || 0;
          const title = player.title || "";
          const seed = player.startingRank || player.rank || idx + 1;
          const federation = player.federation || "IND";

          // Generate unique stable dummy email address for onsite registrations
          let email = "";
          if (fideId && fideId.length > 3) {
            email = `fide_${fideId}@chaduranga-onsite.com`;
          } else {
            const cleanName = name
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .slice(0, 12);
            email = `onsite_${cleanName || "player"}_${seed}_${tournamentId}@chaduranga-onsite.com`;
          }

          return {
            playerName: name,
            email: email,
            rating: rating,
            fideId: fideId,
            seed: seed,
            gender: player.sex || "",
            title: title,
            federation: federation,
            registeredDate: new Date().toISOString().slice(0, 10),
          };
        });

        setRows(parsedRows);
      } else {
        const text = await readFileText(file);

        // Auto-detect file type: TRF files have lines starting with "001 "
        const isTRF = file.name.endsWith(".trf") || 
                      file.name.endsWith(".trfx") || 
                      text.includes("\n001 ") || 
                      text.startsWith("001 ");

        if (isTRF) {
          setFileType("trf");
          const { participants, errors: parseErrors } = parseTRFRows(text, tournamentId);

          if (parseErrors.length > 0) {
            setErrors(parseErrors.slice(0, 15));
            return;
          }

          if (participants.length === 0) {
            setErrors(["No player records starting with '001 ' were found in this FIDE TRF file."]);
            return;
          }

          setRows(participants);
        } else {
          setFileType("csv");
          const csvRows = parseCsvRows(text);

          if (csvRows.length < 1) {
            setErrors(["The file is empty."]);
            return;
          }

          // Scan first 15 rows to find header row containing player name or name
          let headerRowIndex = 0;
          let headers = [];
          
          for (let i = 0; i < Math.min(csvRows.length, 15); i++) {
            const normalizedCells = csvRows[i].map(normalizeHeader);
            if (normalizedCells.includes("player name") || normalizedCells.includes("name")) {
              headerRowIndex = i;
              headers = normalizedCells;
              break;
            }
          }
          
          if (headers.length === 0) {
            headers = csvRows[0].map(normalizeHeader);
          }

          const findColIndex = (possibleNames) => {
            // Try exact match first
            let idx = headers.findIndex((h) => possibleNames.includes(h));
            if (idx >= 0) return idx;
            // Try substring match next
            return headers.findIndex((h) => 
              possibleNames.some((name) => h.includes(name))
            );
          };

          const colIndex = {
            playerName: findColIndex(["player name", "player_name", "name"]),
            rating: findColIndex(["rating", "rtg", "elo", "fide rating"]),
            email: findColIndex(["email", "mail", "e-mail"]),
            fideId: findColIndex(["fideid", "fide id", "fide_id"]),
            serialNumber: findColIndex(["no.", "no", "s.no", "serial no", "serial number", "rank", "seed"]),
            federation: findColIndex(["fed", "federation", "country"]),
            title: findColIndex(["title", "fide title"]),
            registeredDate: findColIndex(["registered date", "registration date", "date"]),
          };

          if (colIndex.playerName === -1) {
            setErrors([
              "Could not find a 'Player Name' column in the CSV file. Please make sure the column header is named 'Player Name' or 'Name'.",
            ]);
            return;
          }

          const validationErrors = [];
          const parsedRows = [];
          const dataRows = csvRows.slice(headerRowIndex + 1);

          dataRows.forEach((cells, index) => {
            const line = headerRowIndex + index + 2;

            if (!cells || cells.length === 0) return;
            const isEmpty = cells.every(cell => !cell || cell.trim() === "");
            if (isEmpty) return;

            const playerName = colIndex.playerName >= 0 ? cells[colIndex.playerName]?.trim() : "";
            const ratingRaw = colIndex.rating >= 0 ? cells[colIndex.rating]?.trim() : "";
            const emailRaw = colIndex.email >= 0 ? cells[colIndex.email]?.trim() : "";
            const fideId = colIndex.fideId >= 0 ? cells[colIndex.fideId]?.trim() : "";
            const fed = colIndex.federation >= 0 ? cells[colIndex.federation]?.trim() : "";
            const title = colIndex.title >= 0 ? cells[colIndex.title]?.trim() : "";

            if (!playerName && !ratingRaw && !fideId) {
              return; // Skip metadata / footer rows
            }

            if (!playerName) {
              validationErrors.push(`Row ${line}: Player Name is required.`);
              return;
            }

            let rating = 0;
            if (ratingRaw) {
              const parsedRating = Number(ratingRaw);
              if (Number.isNaN(parsedRating) || parsedRating < 0) {
                validationErrors.push(`Row ${line}: Rating must be a valid non-negative number.`);
              } else {
                rating = parsedRating;
              }
            }

            let seed = index + 1;
            if (colIndex.serialNumber >= 0) {
              const seedRaw = cells[colIndex.serialNumber]?.trim();
              if (seedRaw) {
                const parsedSeed = parseInt(seedRaw, 10);
                if (!Number.isNaN(parsedSeed)) {
                  seed = parsedSeed;
                }
              }
            }

            let email = emailRaw;
            if (!email) {
              if (fideId && fideId.length > 3) {
                email = `fide_${fideId}@chaduranga-onsite.com`;
              } else {
                const cleanName = playerName
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, "")
                  .slice(0, 12);
                email = `onsite_${cleanName || "player"}_${seed}_${tournamentId}@chaduranga-onsite.com`;
              }
            } else if (!email.includes("@")) {
              validationErrors.push(`Row ${line}: Email is invalid.`);
            }

            parsedRows.push({
              playerName: playerName || "",
              email: email || "",
              rating: rating,
              seed: seed,
              fideId: fideId || "",
              federation: fed || "IND",
              title: title || "",
              gender: "",
              registeredDate:
                colIndex.registeredDate >= 0
                  ? toIsoDate(cells[colIndex.registeredDate]?.trim())
                  : toIsoDate(""),
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
        }
    }
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
    if (rows.length === 0) {
      setErrors(["Upload and validate a file before importing."]);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      await onSubmit(rows);
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
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Import Participants
          </DialogTitle>
          <DialogDescription>
            Upload a CSV exported from Excel (headers: Serial Number, Player Name, Rating, Email, Registered Date),
            a FIDE TRF/report file (.trf, .trfx, .txt), or a Swiss Manager binary tournament file (.tunx).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="grid w-full max-w-sm items-center gap-2">
              <Label htmlFor="participant-file">Participant List File (CSV, TRF, or TUNX)</Label>
              <Input
                id="participant-file"
                type="file"
                accept=".csv,text/csv,.trf,.trfx,.txt,text/plain,.tunx"
                onChange={handleFileSelect}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadTemplate}
              className="mt-6 sm:mt-0"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </div>

          {fileName ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2 bg-muted/50 p-2.5 rounded border">
              Selected file: <span className="font-semibold text-foreground">{fileName}</span>
              <Badge variant="secondary" className="ml-auto">
                {fileType.toUpperCase()} Format Detected
              </Badge>
              <Badge variant="outline">
                {rows.length} players parsed
              </Badge>
            </p>
          ) : null}

          {errors.length > 0 ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                Validation errors
              </div>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className="border rounded-md max-h-[320px] overflow-auto shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="w-16">Seed/SNo</TableHead>
                    <TableHead>Player Name</TableHead>
                    <TableHead className="w-16">Title</TableHead>
                    <TableHead className="w-16">Rating</TableHead>
                    <TableHead className="w-16">FED</TableHead>
                    <TableHead>FIDE ID</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((player, idx) => (
                    <TableRow key={`${player.email}-${idx}`} className="hover:bg-muted/30">
                      <TableCell className="font-bold text-center">
                        {player.seed || idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">{player.playerName}</TableCell>
                      <TableCell>
                        {player.title ? (
                          <Badge variant="outline" className="bg-chess-gold/10 text-chess-gold border-chess-gold/25 font-bold text-[9px] px-1 py-0 h-4">
                            {player.title}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{player.rating || "Unrated"}</TableCell>
                      <TableCell className="font-mono text-xs">{player.federation || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{player.fideId || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]" title={player.email}>
                        {player.email}
                      </TableCell>
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
            disabled={loading || rows.length === 0}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow"
          >
            <Upload className="w-4 h-4 mr-2" />
            {loading
              ? "Importing..."
              : `Import ${rows.length || ""} Participant${rows.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
