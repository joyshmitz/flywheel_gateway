function redactCommand(command: string): string {
  return command
    .replace(
      /(password|secret|token|api[_-]?key|apikey)[=:]\s*[^\s]+/gi,
      "$1=[REDACTED]",
    )
    .replace(/(authorization[=:]\s*)(bearer\s+)?[^\s]+/gi, "$1[REDACTED]")
    .replace(/(bearer\s+)[^\s]+/gi, "$1[REDACTED]");
}

const cases = [
  'curl -H "Authorization: Bearer secret-token" https://api.com',
  "config.py --password=supersecret",
  'config.py --password "super secret"',
  "login --password mypass",
  "export API_KEY=12345",
  'echo "password: mypassword"',
];

cases.forEach((c) => {
  console.log(`Original: ${c}`);
  console.log(`Redacted: ${redactCommand(c)}`);
  console.log("---");
});
