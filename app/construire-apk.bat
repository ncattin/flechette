@echo off
rem Fabrique l'application Android "Fléchette" (fichier Flechette.apk à côté de index.html).
rem Il suffit de double-cliquer sur ce fichier. Durée : 1 à 3 minutes.
chcp 65001 >nul
setlocal
set "OUTILS=%USERPROFILE%\flechette-outils"
set "PROJET=%OUTILS%\projet"
set "WEB=%~dp0.."
set "JAVA_HOME=%OUTILS%\jdk\jdk-21.0.12.1+1"
set "ANDROID_HOME=%OUTILS%\android-sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"

if not exist "%PROJET%\android\gradlew.bat" (
  echo Le projet Android est introuvable dans %PROJET%.
  pause & exit /b 1
)

echo [1/3] Copie de l'appli dans le projet Android...
for %%F in (index.html manifest.webmanifest favicon.png icon-192.png icon-512.png apple-touch-icon.png) do copy /y "%WEB%\%%F" "%PROJET%\www\" >nul
copy /y "%PROJET%\node_modules\@capacitor\core\dist\capacitor.js" "%PROJET%\www\" >nul
cd /d "%PROJET%"
call npx cap sync android >nul 2>&1
if errorlevel 1 ( echo La synchronisation Capacitor a échoué. & pause & exit /b 1 )

echo [2/3] Compilation de l'application (la première fois peut prendre quelques minutes)...
cd /d "%PROJET%\android"
call gradlew.bat assembleRelease --no-daemon -q
if errorlevel 1 ( echo. & echo La compilation a échoué : voir les messages ci-dessus. & pause & exit /b 1 )

echo [3/3] Copie de l'application...
copy /y "%PROJET%\android\app\build\outputs\apk\release\app-release.apk" "%WEB%\Flechette.apk" >nul
echo.
echo Terminé : %WEB%\Flechette.apk
echo Envoie ce fichier sur ton téléphone Android et ouvre-le pour l'installer.
pause
