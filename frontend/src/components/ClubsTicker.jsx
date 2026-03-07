import { motion } from "framer-motion";

const clubs = [
  "♟ King's Gambit Club",
  "♜ Rook's Haven",
  "♞ Knight Riders FC",
  "♛ Queen's Gambit Society",
  "♝ Bishop's Corner",
  "♚ Royal Chess Academy",
  "♟ Blitz Warriors",
  "♜ Endgame Masters",
  "♞ Opening Theory Hub",
  "♛ Grand Prix Chess Club",
  "♝ Tactical Minds",
  "♚ Classic Positional Club",
  "♟ Fischer Memorial",
  "♜ Sicilian Defense Society",
  "♞ Dragon Variation Club",
  "♛ Nimzo-Indian Guild",
];

export function ClubsTicker() {
  // Duplicate clubs for seamless infinite loop
  const tickerItems = [...clubs, ...clubs];

  return (
    <div className="mt-8 -mx-4 md:-mx-6 lg:-mx-8 mb-[-2rem] md:mb-[-3rem] lg:mb-[-4rem] overflow-hidden relative bg-primary border-t-2 border-primary/80">
      {/* Label Badge */}
      <div className="absolute left-0 top-0 bottom-0 z-10 bg-primary/90 flex items-center px-4 md:px-6">
        <span className="text-[10px] md:text-xs font-bold tracking-wider uppercase text-primary-foreground whitespace-nowrap">
          🏅 Chess Clubs
        </span>
        {/* Arrow effect */}
        <div className="absolute right-[-12px] top-0 bottom-0 w-0 h-0 border-t-[50px] border-b-[50px] border-l-[12px] border-l-primary/90 border-t-transparent border-b-transparent" />
      </div>

      {/* Scrolling Track */}
      <motion.div
        className="flex items-center h-12 pl-32 md:pl-40"
        animate={{
          x: [0, -50 + "%"],
        }}
        transition={{
          duration: 45,
          repeat: Infinity,
          ease: "linear",
        }}
        whileHover={{ animationPlayState: "paused" }}
      >
        {tickerItems.map((club, index) => (
          <div
            key={index}
            className="inline-flex items-center gap-2 px-6 md:px-8 border-r border-primary-foreground/20 whitespace-nowrap cursor-pointer hover:text-accent transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/60" />
            <span className="text-xs md:text-sm font-medium text-primary-foreground/90">
              {club}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
