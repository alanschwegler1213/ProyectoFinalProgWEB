const form = document.getElementById('contactoForm') as HTMLFormElement;
const nombreInput = document.getElementById('nombre') as HTMLInputElement;
const emailInput = document.getElementById('email') as HTMLInputElement;

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = nombreInput.value.trim();
    const email = emailInput.value.trim();

    if (nombre === '') {
        alert('El nombre no puede estar vacío.');
        return;
    }

    if (!isValidEmail(email)) {
        alert('Por favor, introduce un correo electrónico válido.');
        return;
    }

    const formData = new FormData(form);
    const body = new URLSearchParams(formData as any);

    try {
        const res = await fetch('http://localhost:3000/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body
        });

        if (!res.ok) {
            const txt = await res.text();
            alert('Error guardando: ' + txt);
            return;
        }

        alert('✅ Datos guardados correctamente');
        form.reset();
    } catch (err) {
        if (err instanceof Error) {
            alert('Error de red: ' + err.message);
        }
         else {
            alert('Error de red: ' + String(err));
        }
    }
});

function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

interface Usuario {
    id: number;
    name: string;
    email: string;
    created_at: string;
}

interface SessionUser {
    id: number;
    username: string;
    role: string;
}

let currentUser: SessionUser | null = null;

async function verificarSesion() {
    try {
        const res = await fetch('http://localhost:3000/api/session', {
            credentials: 'include'
        });
        const data = await res.json();
        
        if (data.authenticated && data.user) {
            currentUser = data.user;
            actualizarUI();
        } else {
            currentUser = null;
            actualizarUI();
        }
    } catch (error) {
        console.error('Error verificando sesión:', error);
        currentUser = null;
        actualizarUI();
    }
}

function actualizarUI() {
    const btnAdmin = document.getElementById('btnAdmin') as HTMLButtonElement;
    const btnLogout = document.getElementById('btnLogout') as HTMLButtonElement;
    
    if (currentUser && currentUser.role === 'admin') {
        if (btnAdmin) {
            btnAdmin.style.display = 'inline-block';
            btnAdmin.textContent = '🔐 Panel Administrador';
        }
        if (btnLogout) {
            btnLogout.style.display = 'inline-block';
        }
    } else if (currentUser) {
        if (btnAdmin) {
            btnAdmin.style.display = 'inline-block';
            btnAdmin.textContent = '👤 Panel de Usuario';
        }
        if (btnLogout) {
            btnLogout.style.display = 'inline-block';
        }
    } else {
        if (btnAdmin) {
            btnAdmin.style.display = 'inline-block';
            btnAdmin.textContent = '🔐 Iniciar Sesión';
        }
        if (btnLogout) {
            btnLogout.style.display = 'none';
        }
    }
}

async function logout() {
    try {
        const res = await fetch('http://localhost:3000/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (res.ok) {
            currentUser = null;
            actualizarUI();
            window.location.href = 'StorePhone.html';
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

const btnLogout = document.getElementById('btnLogout') as HTMLButtonElement;
btnLogout?.addEventListener('click', logout);

verificarSesion();

const btnAdmin = document.getElementById('btnAdmin') as HTMLButtonElement;
const btnCerrarAdmin = document.getElementById('btnCerrarAdmin') as HTMLButtonElement;
const sectionAdmin = document.getElementById('Admin') as HTMLElement;
const tablaUsuarios = document.getElementById('tabla-usuarios') as HTMLElement;

btnAdmin?.addEventListener('click', async () => {
    if (!currentUser) {
        await verificarSesion();
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
    }
    
    const tituloAdmin = document.getElementById('titulo-admin');
    if (tituloAdmin) {
        if (currentUser.role === 'admin') {
            tituloAdmin.textContent = 'Panel de Administración';
        } else {
            tituloAdmin.textContent = 'Panel de Usuario';
        }
    }
    
    const descripcionAdmin = sectionAdmin.querySelector('p');
    if (descripcionAdmin) {
        if (currentUser.role === 'admin') {
            descripcionAdmin.textContent = 'Gestiona los usuarios registrados';
        } else {
            descripcionAdmin.textContent = 'Visualiza los usuarios registrados (solo lectura)';
        }
    }
    
    sectionAdmin.style.display = 'block';
    sectionAdmin.scrollIntoView({ behavior: 'smooth' });
    await verificarSesion();
    cargarUsuarios();
});

btnCerrarAdmin?.addEventListener('click', () => {
    sectionAdmin.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

async function cargarUsuarios() {
    try {
        tablaUsuarios.innerHTML = '<p>Cargando usuarios...</p>';
        
        const res = await fetch('http://localhost:3000/api/usuarios', {
            credentials: 'include'
        });
        
        if (!res.ok) {
            if (res.status === 401) {
                await verificarSesion();
                tablaUsuarios.innerHTML = '<p>No hay usuarios registrados</p>';
                return;
            }
            const usuarios: Usuario[] = [];
            const esAdmin = currentUser ? currentUser.role === 'admin' : false;
            mostrarUsuarios(usuarios, esAdmin);
            return;
        }
        
        const data = await res.json();
        
        let usuarios: Usuario[] = [];
        
        if (Array.isArray(data)) {
            usuarios = data;
        } else if (data && typeof data === 'object') {
            if (Array.isArray(data.usuarios)) {
                usuarios = data.usuarios;
            } else {
                usuarios = [];
            }
        }
        const esAdmin = currentUser ? currentUser.role === 'admin' : false;
        mostrarUsuarios(usuarios, esAdmin);
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        const usuarios: Usuario[] = [];
        const esAdmin = currentUser ? currentUser.role === 'admin' : false;
        mostrarUsuarios(usuarios, esAdmin);
    }
}

// Escapa texto antes de insertarlo como HTML (evita XSS almacenado)
function escapeHtml(valor: unknown): string {
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function mostrarUsuarios(usuarios: Usuario[], esAdmin: boolean = false) {
    if (usuarios.length === 0) {
        tablaUsuarios.innerHTML = '<p>No hay usuarios registrados</p>';
        return;
    }
    
    const columnasAcciones = esAdmin ? '<th>Acciones</th>' : '';
    
    const html = `
        ${!esAdmin ? '<p style="color: #ffc107; margin-bottom: 15px; text-align: center; font-style: italic;">📖 Vista de solo lectura. Solo administradores pueden editar o eliminar usuarios.</p>' : ''}
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Fecha Registro</th>
                    ${columnasAcciones}
                </tr>
            </thead>
            <tbody>
                ${usuarios.map(u => `
                    <tr>
                        <td class="col-id">${Number(u.id)}</td>
                        <td class="col-name">${escapeHtml(u.name)}</td>
                        <td class="col-email">${escapeHtml(u.email)}</td>
                        <td class="col-created">${new Date(u.created_at.replace(' ', 'T') + 'Z').toLocaleString()}</td>
                        ${esAdmin ? `
                            <td class="col-actions">
                                <button class="btn-editar" data-id="${Number(u.id)}">✏️ Editar</button>
                                <button class="btn-eliminar" data-id="${Number(u.id)}">🗑️ Eliminar</button>
                            </td>
                        ` : ''}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    tablaUsuarios.innerHTML = html;
    
    if (esAdmin) {
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLButtonElement;
                const id = parseInt(target.dataset.id || '0');
                const row = target.closest('tr');
                const name = row?.querySelector<HTMLTableCellElement>('.col-name')?.textContent?.trim() || '';
                const email = row?.querySelector<HTMLTableCellElement>('.col-email')?.textContent?.trim() || '';
                editarUsuario(id, name, email);
            });
        });
        
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLButtonElement;
                const id = parseInt(target.dataset.id || '0');
                const row = target.closest('tr');
                const name = row?.querySelector<HTMLTableCellElement>('.col-name')?.textContent?.trim() || '';
                eliminarUsuario(id, name);
            });
        });
    }
}

async function editarUsuario(id: number, nombreActual: string, emailActual: string) {
    const nuevoNombre = prompt('Nuevo nombre:', nombreActual);
    if (!nuevoNombre || nuevoNombre.trim() === '') return;
    
    const nuevoEmail = prompt('Nuevo email:', emailActual);
    if (!nuevoEmail || nuevoEmail.trim() === '') return;
    
    if (!isValidEmail(nuevoEmail)) {
        alert('Email inválido');
        return;
    }
    
    try {
        const res = await fetch(`http://localhost:3000/api/usuarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                name: nuevoNombre.trim(), 
                email: nuevoEmail.trim() 
            })
        });
        
        if (!res.ok) {
            const error = await res.json();
            alert('Error: ' + error.error);
            return;
        }
        
        alert('✅ Usuario actualizado correctamente');
        cargarUsuarios();
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        alert('Error al actualizar usuario');
    }
}

async function eliminarUsuario(id: number, nombre: string) {
    if (!confirm(`¿Estás seguro de eliminar a "${nombre}"?`)) return;
    
    try {
        const res = await fetch(`http://localhost:3000/api/usuarios/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!res.ok) {
            const error = await res.json();
            alert('Error: ' + error.error);
            return;
        }
        
        alert('✅ Usuario eliminado correctamente');
        cargarUsuarios();
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        alert('Error al eliminar usuario');
    }
}
