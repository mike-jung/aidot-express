Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
Name "Aidot Express Server ${VERSION} (${EDITION})"
OutFile "${OUTPUT_FILE}"
InstallDir "$PROGRAMFILES64\AidotExpressServer-${EDITION}\${VERSION}"
RequestExecutionLevel admin
SetCompressor /SOLID lzma
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "This installer requires 64-bit Windows."
    Abort
  ${EndIf}
  SetRegView 64
FunctionEnd
Section "Install server files"
  IfFileExists "$INSTDIR\SERVER_MANIFEST.json" 0 +3
    MessageBox MB_ICONSTOP "This version directory already exists. Choose a new directory; existing files are preserved."
    Abort
  SetOutPath "$INSTDIR"
  File /r "${RELEASE_DIR}\*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  SetShellVarContext all
  CreateDirectory "$SMPROGRAMS\Aidot Express Server (${EDITION})"
  CreateShortCut "$SMPROGRAMS\Aidot Express Server (${EDITION})\Server instructions.lnk" "$INSTDIR\README.md"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AidotExpressServer-${EDITION}-${VERSION}" "DisplayName" "Aidot Express Server ${VERSION} (${EDITION})"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AidotExpressServer-${EDITION}-${VERSION}" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AidotExpressServer-${EDITION}-${VERSION}" "DisplayVersion" "${VERSION}"
  MessageBox MB_ICONINFORMATION "Server files are installed.$\r$\nFollow README.md to configure HTTPS and register the Windows service.$\r$\nExisting settings, databases and services have been preserved."
SectionEnd
Section "Uninstall"
  SetRegView 64
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\service\uninstall.ps1" -RemoveFiles'
  Pop $0
  ${If} $0 != 0
    MessageBox MB_ICONSTOP "Service removal failed. No further files will be removed; see the installation log."
    Abort
  ${EndIf}
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AidotExpressServer-${EDITION}-${VERSION}"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
SectionEnd
