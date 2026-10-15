@echo off
rem Fabrique l'application d'essai "Pointe IA" (reseau de neurones) : PointeIA.apk dans le dossier flechette-ia.
rem Elle s'installe A COTE de Flechette (autre application). Double-clique sur ce fichier. Duree : 1 a 3 minutes.
setlocal
set "OUTILS=%USERPROFILE%\flechette-outils"
set "PROJET=%OUTILS%\projet-ia"
set "WEB=%~dp0.."
set "JAVA_HOME=%OUTILS%\jdk\jdk-21.0.12.1+1"
set "ANDROID_HOME=%OUTILS%\android-sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"

if not exist "%PROJET%\android\gradlew.bat" goto pasprojet

if exist "%WEB%\ort\ort-wasm-simd-threaded.wasm" goto moteurok
echo Copie du moteur du reseau de neurones...
mkdir "%WEB%\ort" 2>nul
copy /y "%PROJET%\node_modules\onnxruntime-web\dist\ort.wasm.min.js" "%WEB%\ort\" >nul
copy /y "%PROJET%\node_modules\onnxruntime-web\dist\ort-wasm-simd-threaded.mjs" "%WEB%\ort\" >nul
copy /y "%PROJET%\node_modules\onnxruntime-web\dist\ort-wasm-simd-threaded.wasm" "%WEB%\ort\" >nul
:moteurok

echo [1/3] Copie de l'appli, du moteur et du modele dans le projet Android...
for %%F in (index.html manifest.webmanifest favicon.png icon-192.png icon-512.png apple-touch-icon.png) do copy /y "%WEB%\%%F" "%PROJET%\www\" >nul
copy /y "%PROJET%\node_modules\@capacitor\core\dist\capacitor.js" "%PROJET%\www\" >nul
mkdir "%PROJET%\www\ort" 2>nul
mkdir "%PROJET%\www\ia\modele" 2>nul
copy /y "%WEB%\ort\*" "%PROJET%\www\ort\" >nul
copy /y "%WEB%\ia\modele\tipnet.onnx" "%PROJET%\www\ia\modele\" >nul
cd /d "%PROJET%"
call npx cap sync android >nul 2>&1
if errorlevel 1 goto echecsync

echo [2/3] Compilation de l'application (la premiere fois peut prendre quelques minutes)...
pushd "%PROJET%\android"
call "%PROJET%\android\gradlew.bat" assembleRelease --no-daemon -q
if errorlevel 1 goto echeccompil

echo [3/3] Copie de l'application...
copy /y "%PROJET%\android\app\build\outputs\apk\release\app-release.apk" "%WEB%\PointeIA.apk" >nul
echo.
echo Termine : %WEB%\PointeIA.apk
echo Envoie ce fichier sur ton telephone et ouvre-le : Pointe IA s'installe a cote de Flechette.
goto fin

:pasprojet
echo Le projet Android de Pointe IA est introuvable dans %PROJET%.
goto fin
:echecsync
echo La synchronisation Capacitor a echoue.
goto fin
:echeccompil
echo.
echo La compilation a echoue : voir les messages ci-dessus.
:fin
pause
