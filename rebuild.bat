@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
set PATH=%USERPROFILE%\.cargo\bin;%PATH%
cd /d C:\Users\User\Documents\Projects\seatai\core
wasm-pack build --target web --out-dir ../web/src/wasm
