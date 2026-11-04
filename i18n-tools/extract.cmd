@echo off
rem Gathers the site's English into i18n-tools\strings.tsv. Uses the Electron
rem installed in the Djinja app repo, so nothing is installed here.
set ELECTRON_RUN_AS_NODE=
set "E=C:\Users\carlo\OneDrive\Djinja\Djinja\node_modules\electron\dist\electron.exe"
set "D=%~dp0"
"%E%" "%D:~0,-1%"
