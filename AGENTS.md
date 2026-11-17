# Global Codex instructions — Windows / PowerShell / file safety

These instructions apply to all repositories unless a project-specific instruction
adds a more specific requirement.

## Operating environment

- On Windows, prefer PowerShell 7 (`pwsh`) when running shell commands.
- Do not assume that PowerShell 7 is installed. If a command depends on it, check
  `$PSVersionTable.PSVersion` and explain if the required version is unavailable.
- Keep shell commands simple. Prefer several short commands over one deeply nested
  command with complicated quoting.

## Editing files

- Prefer Codex's direct file-editing capability or `apply_patch` for source changes.
- For an existing file, make the smallest practical patch. Do not rewrite the whole
  file for a small change.
- Do not generate source code by assembling complex PowerShell command strings.
- Avoid `echo`, `Out-File`, `Set-Content`, and `Add-Content` for writing source files
  when a direct edit or patch is available.
- If a script must create a text file, use an explicit encoding and a literal here-string
  where appropriate. For example, use a single-quoted here-string (`@' ... '@`) to
  prevent PowerShell variable expansion.
- Do not put source code inside nested shell quotes unless there is no practical
  alternative.
- Do not use backticks for PowerShell line continuation. Prefer splatting, variables,
  or separate commands.
- Remember that PowerShell's backtick is an escape character. Avoid unnecessary
  escaping and verify literal backticks in generated content.

## Encoding

- For newly created source/text files, use UTF-8 without BOM unless the project
  explicitly requires another encoding.
- When modifying an existing file, preserve its current encoding and line-ending
  convention where practical. Do not silently convert an entire file.
- Never rely on the machine's legacy/default code page for file output.
- When using .NET file APIs from PowerShell, specify the encoding explicitly, e.g.
  `[System.Text.UTF8Encoding]::new($false)` for UTF-8 without BOM.
- Do not assume that setting console encoding also controls the encoding used by
  every file-writing command; these are separate concerns.

## PowerShell command practices

- Prefer single-quoted strings when interpolation is not needed.
- Use double-quoted strings only when variable interpolation is intended.
- Use single-quoted here-strings for literal multiline content.
- Avoid fragile combinations of PowerShell, JSON, C#, JavaScript, and shell quoting.
- For complex data, prefer a temporary `.ps1` file or a structured input file over
  passing a large escaped string on the command line.
- Do not change the user's PowerShell profile or machine-wide settings unless asked.

## Validation after edits

After changing files:

1. Re-read the changed file or inspect the diff.
2. Check that quotes, backticks, Unicode characters, and line endings are intact.
3. Check encoding when the file type or symptoms make encoding relevant.
4. Run the narrowest relevant formatter, build, or tests.
5. Report commands that were not run and any failures honestly.

A successful write command does not prove that the resulting file is correct.

## Keep changes focused

- Do not make unrelated formatting or encoding changes.
- Do not add dependencies just to work around a quoting problem.
- If a write or patch fails, inspect the current file before retrying; do not blindly
  repeat a potentially destructive command.
