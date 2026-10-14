@echo off
rem Fabrique l'application d'essai « Pointe IA » (réseau de neurones) : PointeIA.apk à côté de index.html.
rem Elle s'installe À CÔTÉ de Fléchette (autre application). Double-clique sur ce fichier. Durée : 1 à 3 minutes.
chcp 65001 >nul
setlocal
set "OUTILS=%USERPROFILE%\flechette-outils"
set "PROJET=%OUTILS%\projet-ia"
set "WEB=%~dp0.."
set "JAVA_HOME=%OUTILS%\jdk\jdk-21.0.12.1+1"
set "ANDROID_HOME=%OUTILS%\android-sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"

if not exist "%PROJET%\android\gradlew.bat" (
  echo Le projet Android de Pointe IA est introuvable dans %PROJET%.
  pause & exit /b 1
)
if not exist "%WEB%\ort\ort-wasm-simd-threaded.wasm" (
  echo Copie du moteur du réseau de neurones...
  mkdir "%WEB%\ort" 2>nul
  copy /y "%PROJET%\node_modules\onnxruntime-web\dist\ort.wasm.min.js" "%WEB%\ort\" >nul
  copy /y "%PROJET%\node_modules\onnxruntime-web\dist\ort-wasm-simd-threaded.mjs" "%WEB%\ort\" >nul
  copy /y "%PROJET%\node_modules\onnxruntime-web\dist\ort-wasm-simd-threaded.wasm" "%WEB%\ort\" >nul
)

echo [1/3] Copie de l'appli, du moteur et du modèle dans le projet Android...
for %%F in (index.html manifest.webmanifest favicon.png icon-192.png icon-512.png apple-touch-icon.png) do copy /y "%WEB%\%%F" "%PROJET%\www\" >nul
copy /y "%PROJET%\node_modules\@capacitor\core\dist\capacitor.js" "%PROJET%\www\" >nul
mkdir "%PROJET%\www\ort" 2>nul
mkdir "%PROJET%\www\ia\modele" 2>nul
copy /y "%WEB%\ort\*" "%PROJET%\www\ort\" >nul
copy /y "%WEB%\ia\modele\tipnet.onnx" "%PROJET%\www\ia\modele\" >nul
cd /d "%PROJET%"
call npx cap sync android >nul 2>&1
if errorlevel 1 ( echo La synchronisation Capacitor a échoué. & pause & exit /b 1 )

echo [2/3] Compilation de l'application (la première fois peut prendre quelques minutes)...
cd /d "%PROJET%\android"
call gradlew.bat assembleRelease --no-daemon -q
if errorlevel 1 ( echo. & echo La compilation a échoué : voir les messages ci-dessus. & pause & exit /b 1 )

echo [3/3] Copie de l'application...
copy /y "%PROJET%\android\app\build\outputs\apk\release\app-release.apk" "%WEB%\PointeIA.apk" >nul
echo.
echo Terminé : %WEB%\PointeIA.apk
echo Envoie ce fichier sur ton téléphone et ouvre-le : Pointe IA s'installe à côté de Fléchette.
pause
