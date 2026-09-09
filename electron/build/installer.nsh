; Aidot Express 1.43.2 — NSIS handles installation; Electron handles first-run configuration.
; Database credentials are entered in the validated Electron setup window, where
; environment values are serialized consistently. Existing userData is preserved.
!macro customInstall
  DetailPrint "First-run database and port setup opens in Aidot Express."
  DetailPrint "Configuration and logs: %APPDATA%\Aidot Express"
!macroend

!macro customUnInstall
  ; Application data, credentials and workspace are intentionally preserved.
!macroend
