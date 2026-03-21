@echo off
echo ========================================
echo   BeerSocial - GitHub Setup Script
echo ========================================
echo.

REM Verificar se estamos na pasta correta
if not exist "package.json" (
    echo [ERRO] Corre este script na pasta do projeto (onde esta o package.json)
    pause
    exit /b 1
)

REM Inicializar Git se necessario
if not exist ".git" (
    echo [1/5] A inicializar Git...
    git init
) else (
    echo [1/5] Git ja inicializado
)

REM Adicionar remote
echo [2/5] A configurar remote...
git remote remove origin 2>nul
git remote add origin https://github.com/andreneves7/beersocial.git

REM Adicionar ficheiros
echo [3/5] A adicionar ficheiros...
git add -A

REM Commit
echo [4/5] A criar commit...
git commit -m "BeerSocial - Social app para cervejas com Redis, MongoDB e Cassandra"

REM Push
echo [5/5] A enviar para GitHub...
echo.
echo IMPORTANTE: Quando pedir credenciais:
echo   - Username: andreneves7
echo   - Password: Usa o teu Personal Access Token (nao a password)
echo.
pause
git push -u origin master

echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo   SUCESSO! Repositorio disponivel em:
    echo   https://github.com/andreneves7/beersocial
) else (
    echo   Ocorreu um erro. Verifica as credenciais.
)
echo ========================================
pause
