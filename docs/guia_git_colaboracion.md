# Guía de Instalación y Flujo de Trabajo Colaborativo en Git/GitHub

Este documento resume los pasos necesarios para configurar el entorno del segundo desarrollador (en Ubuntu) y gestionar la colaboración entre la parte **Web** (Frontend/Backend) y la parte de **Dispositivo** (Firmware CollarNet).

---

## 1. Instalación y Configuración Inicial (Equipo 2 - Ubuntu)

En la terminal del equipo secundario, ejecutar:

```bash
# 1. Actualizar repositorios e instalar Git y GitHub CLI
sudo apt update && sudo apt install -y git gh

# 2. Configurar la identidad del desarrollador
git config --global user.name "Nombre del Colaborador"
git config --global user.email "colaborador@ejemplo.com"

# 3. Autenticarse en GitHub (guía interactiva)
gh auth login
```

---

## 2. Estrategias de Descarga y Accesos

### Opción A: Separación en 2 Repositorios (Recomendado por Seguridad)
GitHub gestiona permisos **a nivel de repositorio completo**. Si no deseas que el desarrollador web tenga acceso al código C++/firmware del dispositivo (`CollarNet.ino`, `secrets.h`, etc.):

- **`CollarNet-Web`** (Público/Compartido): Contiene solo `/frontend` y `/backend`.
- **`CollarNet-Firmware`** (Privado Administrador): Contiene el código de hardware y calibración.

```bash
# En el equipo del colaborador:
git clone https://github.com/tu-usuario/CollarNet-Web.git
```

### Opción B: Sparse Checkout (Si comparten el mismo repositorio)
Si confías en la persona y comparten un solo repositorio, pero el colaborador **solo desea descargar en su disco local** las carpetas `frontend` y `backend`:

```bash
# En el equipo del colaborador:
mkdir CollarNet && cd CollarNet
git init
git remote add origin https://github.com/tu-usuario/CollarNet.git

# Configurar descarga exclusiva de carpetas
git sparse-checkout init --cone
git sparse-checkout set frontend backend

# Traer los archivos
git pull origin main
```

---

## 3. Flujo de Trabajo Diarios (Ramas y Merges)

El colaborador nunca debe subir cambios directamente a la rama `main`.

### En la computadora del colaborador:
```bash
# 1. Crear una rama de trabajo según su área
git checkout -b feature/frontend-ajustes
# o
git checkout -b feature/backend-api

# 2. Guardar cambios y subir a GitHub
git add .
git commit -m "Añadidos nuevos campos a la tabla de animales"
git push -u origin feature/frontend-ajustes
```

### En la computadora del Administrador (Tú):
1. Entrar a GitHub y revisar el **Pull Request** generado.
2. Aprobar los cambios y presionar **Merge Pull Request**.
3. O desde tu terminal local:
   ```bash
   git fetch origin
   git checkout main
   git pull origin main
   git merge origin/feature/frontend-ajustes
   git push origin main
   ```

---

## 4. Asignar Permisos en GitHub y Bloquear Subidas Directas a `main`

### Paso 1: Dar permisos de colaborador a tu compañero
1. Entra a tu repositorio en **GitHub**.
2. Haz clic en **Settings** (Configuración) en la parte superior derecha del repositorio.
3. En el menú lateral izquierdo, ve a **Access** -> **Collaborators**.
4. Haz clic en el botón verde **Add people** (Agregar personas).
5. Escribe el **usuario de GitHub** o el **correo electrónico** de tu compañero.
6. Presiona **Add [usuario] to this repository**.
7. Tu compañero recibirá un correo o puede aceptar la invitación en `https://github.com/tu-usuario/tu-repo/invitations`.

### Paso 2: Proteger la rama `main` (Obligar a trabajar en ramas)
Para asegurarte de que **nadie (ni tu compañero)** pueda hacer `git push origin main` directamente y romper el código de producción:

1. En GitHub, ve a **Settings** -> **Branches** (en el menú lateral).
2. En la sección *Branch protection rules*, haz clic en **Add branch protection rule**.
3. En **Branch name pattern**, escribe exactamente: `main`.
4. Marca las siguientes casillas:
   - ✅ **Require a pull request before merging** *(Exige crear un Pull Request)*.
   - ✅ **Require approvals** *(Obliga a que tú como administrador apruebes los cambios antes de fusionar)*.
   - ✅ **Do not allow bypassing the above settings** *(Aplica la regla estrictamente)*.
5. Haz clic en el botón verde **Create** o **Save changes** (al final de la página).

> **Resultado:** Si tu colaborador intenta hacer `git push origin main`, GitHub rebotará la orden con un error de protección. **Tendrá obligatoriamente que subir su rama (`git push origin feature/mi-rama`) y tú serás quien apruebe y haga el Merge.**

