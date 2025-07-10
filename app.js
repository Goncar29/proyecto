require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const fs = require('fs');
const path = require('path');
const usersFilePath = path.join(__dirname, 'users.json');
const app = express();

app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies

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
        res
            .status(500)
            .json({ error: "Error al leer el archivo o archivo corrupto" });
    }
    // fs.readFile(usersFilePath, 'utf-8', (err, data) => {
    //     if (err) {
    //         return res.status(500).json({
    //             error: 'Error al leer el archivo de usuarios'
    //         });
    //     }
    //     const user = JSON.parse(data);
    //     res.json(user);
    // })

});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});