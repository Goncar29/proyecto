// require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const prisma = require('.src/utils/prismaClient');
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing
const jwt = require('jsonwebtoken'); // Import jsonwebtoken for token handling

const LoggerMiddleware = require('./src/middlewares/logger'); // Import the logger middleware
const errorHandle = require('./src/middlewares/errorHandler'); // Import the error handler middleware
const { validateUser, isUniqueNumericId } = require('./src/utils/validations'); // Import validation functions
const authenticateToken = require('./src/middlewares/auth'); // Import authentication middleware
const fs = require('fs'); // File system module to read files
const path = require('path'); // Path module to handle file paths
const usersFilePath = path.join(__dirname, 'users.json'); // Path to the users.json file
const app = express();

app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies
app.use(LoggerMiddleware); // Use the logger middleware for all routes
app.use(errorHandle); // Use the error handler middleware for all routes

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
    res.send(`
        <h1>Curso Express.js</h1>
        <p>¡Bienvenido al proyecto con Express.js!</p>
        <p>Este es un ejemplo básico de una aplicación Express.js.</p>
        <p>Escuchando el ${PORT}</p>
        `);
});

app.get('/user/:id', (req, res) => {
    const userId = req.params.id;
    res.send(`User ID: ${userId}`);
})

app.get('/search', (req, res) => {
    const terms = req.query.termino || 'No especificado';
    const category = req.query.category || 'Todas';

    res.send(`
        <h2>Resultados de la búsqueda</h2>
        <p>Término de búsqueda: ${terms}</p>
        <p>Categoría: ${category}</p>
        `);
});

app.post('/form', (req, res) => {
    const name = req.body.nombre || 'Anonimo';
    const email = req.body.email || 'No especificado';

    res.json({
        message: `Formulario recibido`,
        data: {
            name,
            email
        }
    });
});

app.post('/api/data', (req, res) => {
    const data = req.body;

    if (err) {
        return res.status(500).json({
            error: `Erro con la conexion al servidor`
        });
    }

    res.status(201).json({
        message: `Datos recibidos correctamente`,
        data: data
    });
})

app.get('/users', async (req, res) => {
    try {
        const data = await fs.promises.readFile(usersFilePath, "utf-8");
        const users = JSON.parse(data);
        res.json(users);
    } catch (err) {
        console.error("Error al leer users.json:", err);
        res.status(500).json({ error: "Error con conexión de datos" });
    }
});

app.post('/users', async (req, res) => {
    const newUser = req.body;
    try {
        const data = await fs.promises.readFile(usersFilePath, 'utf-8');
        const users = JSON.parse(data);
        const validation = validateUser(newUser, users);
        if (!validation.isValid) {
            return res.status(400).json({
                error: validation.error || 'Error de validación'
            });
        }
        users.push(newUser);
        await fs.promises.writeFile(usersFilePath, JSON.stringify(users, null, 2));
        res.status(201).json({
            message: 'Usuario creado correctamente',
            user: newUser
        });
    } catch (err) {
        console.error('Error al guardar el usuario', err);
        res.status(500).json({ error: 'Error con conexión de datos' });
    }
});

app.put('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const updateUser = req.body;

    try {
        const data = await fs.promises.readFile(usersFilePath, 'utf-8');
        let users = JSON.parse(data);
        const validation = isUniqueNumericId(updateUser.id, users);
        if (validation) {
            return res.status(400).json({
                error: 'El ID debe ser numérico y único.'
            });
        } else if (!users.some(user => user.id === userId)) {
            return res.status(404).json({
                error: 'Usuario no encontrado.'
            });
        }
        users = users.map(user => {
            return user.id === userId ? { ...user, ...updateUser } : user;
        });
        await fs.promises.writeFile(usersFilePath, JSON.stringify(users, null, 2));
        res.status(200).json({
            message: 'Usuario actualizado correctamente',
            user: updateUser
        });
    } catch (error) {
        console.error('Error al actualizar el usuario', error);
        return res.status(500).json({ error: 'Error con conexión de datos' });
    }
});

app.delete('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    try {
        const data = await fs.promises.readFile(usersFilePath, 'utf-8');
        let users = JSON.parse(data);
        if (!users.some(user => user.id === userId)) {
            return res.status(404).json({
                error: 'Usuario no encontrado.'
            });
        }
        users = users.filter(user => user.id !== userId);
        await fs.promises.writeFile(usersFilePath, JSON.stringify(users, null, 2));
        res.status(200).json({
            message: 'Usuario eliminado correctamente',
            userId: userId
        });
    } catch (error) {
        console.error('Error al eliminar el usuario', error);
        return res.status(500).json({ error: 'Error con conexión de datos' });
    }
});

app.get('/error', (req, res, next) => {
    next(new Error("Error intencional"));
});

app.get('/db-users', async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (error) {
        console.error('Error al obtener usuarios de la base de datos:', error);
        res.status(500).json({ error: 'Error con conexión a la base de datos' });
    }
});

app.get('/protected-route', authenticateToken, (req, res) => {
    res.send('Esta es una ruta protegida, acceso permitido para el usuario autenticado.');
});

app.post('/register', async (req, res) => {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'USER'
            }
        });
        res.status(201).json({ message: 'Usuario registrado con éxito', user });
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        res.status(500).json({ error: 'Error con conexión a la base de datos' });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        const isPasswordValid = user ? await bcrypt.compare(password, user.password) : false;

        if (!user || !isPasswordValid) {
            return res.status(401).json({ error: 'Usuario y/o contraseña incorrecta' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Inicio de sesión exitoso', token });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ error: 'Error con conexión a la base de datos' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});