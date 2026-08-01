if (typeof window !== "undefined") {
  // Fill this with your own ignore patterns
  const ignorePatterns = [
  ];

  const shouldIgnore = (...args) => {
    const msg = args.map(String).join(" ").toLowerCase();
    return ignorePatterns.some((p) => msg.includes(p));
  };

  const originalError = console.error;
  console.error = (...args) => {
    if (shouldIgnore(...args)) return;
    originalError.apply(console, args);
  };

  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (shouldIgnore(...args)) return;
    originalWarn.apply(console, args);
  };

  const originalLog = console.log;
  console.log = (...args) => {
    if (shouldIgnore(...args)) return;
    originalLog.apply(console, args);
  };
}
