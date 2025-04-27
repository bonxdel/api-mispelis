import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import { guardarPeli, borrarPeli, cambiarCategoria } from "./db.js";


dotenv.config();

const urlMongo = process.env.DB_URL;
const servidor = express();

servidor.use(cors());
servidor.use(express.json());


// Gestión del login de usuarios
servidor.post("/login", async (peticion, respuesta) => {
    const { usuario, contraseña } = peticion.body;

    try {
        const conexion = await MongoClient.connect(urlMongo);
        const baseDatos = conexion.db("mispelis");
        const usuarios = baseDatos.collection("usuariosmp");

        const encontrado = await usuarios.findOne({ usuario });

        if (!encontrado) {
            return respuesta.status(400).json({ error: "Usuario no encontrado" });
        }

        if (encontrado.contraseña !== contraseña) {
            return respuesta.status(400).json({ error: "Contraseña incorrecta" });
        }

        conexion.close();
        respuesta.json({ mensaje: "Acceso concedido", usuario: encontrado.usuario });

    } catch (error) {
        respuesta.status(500)

        respuesta.json({ error : "Error en el servidor" });
    }
});


// Obtener las pelis del usuario
servidor.get("/mispelis/:usuario/:tipo", async (peticion, respuesta) => {
    const usuario = peticion.params.usuario;
    const tipo = peticion.params.tipo;

    if (!usuario) {
        return respuesta.status(400).json({ error: "Usuario no autenticado" });
    }

    try {
        const conexion = await MongoClient.connect(urlMongo);
        const baseDatos = conexion.db("mispelis");
        const coleccion = baseDatos.collection("pelis");

        const peliculas = await coleccion.find({ usuario: usuario, tipo: tipo }).toArray();
        respuesta.json(peliculas);

        conexion.close();
    } catch (error) {
        respuesta.status(500)

        respuesta.json({ error : "Error en el servidor" });
    }
});


// Añadir una peli con el tipo "favorita" a la bbdd
servidor.post("/pelifavorita", async (peticion, respuesta) => {
    const peli = peticion.body;
    const { usuario } = peticion.body; // Recibimos el usuario desde el cuerpo de la solicitud

    if (!usuario) {
        return respuesta.status(400).json({ error: "Usuario no autenticado" });
    }

    try {
        // Asocia la peli al usuario logueado
        peli.usuario = usuario;
        const nueva = await guardarPeli(peli);
        respuesta.status(200).json(nueva);
    } catch (error) {
        respuesta.status(500)

        respuesta.json({ error : "Error en el servidor" });
    }
});



// Añadir una peli con el tipo "vista" a la bbdd
servidor.post("/pelivista", async (peticion, respuesta) => {
    const peli = peticion.body;
    const { usuario } = peticion.body; // Recibimos el usuario desde el cuerpo de la solicitud

    if (!usuario) {
        return respuesta.status(400).json({ error: "Usuario no autenticado" });
    }
    try {
        // Asocia la peli al usuario logueado
        peli.usuario = usuario;
        const nueva = await guardarPeli(peli);
        respuesta.status(200).json(nueva);
    } catch (error) {
        respuesta.status(500)

        respuesta.json({ error : "Error en el servidor" });
    }
});


// Middleware para cambiar la categoría de una peli
servidor.put("/cambiarcategoria/:id([0-9a-f]{24})", async (peticion, respuesta) => {
    const { tipo } = peticion.body;
    const { id } = peticion.params;

    try {
        const peliActualizada = await cambiarCategoria(id, tipo);

        if (!peliActualizada) {
            return respuesta.status(404).json({ error: "Película no encontrada" });
        }

        respuesta.status(200).json(peliActualizada);
    } catch (error) {
        respuesta.status(500)

        respuesta.json({ error : "Error en el servidor" });
    }
});
           

// Middleware para eliminar pelis de la bd
servidor.delete("/borrarpeli/:id([0-9a-f]{24})", async (peticion, respuesta) => {    
    const { id } = peticion.params;
    try {
        let count = await borrarPeli(id);

        if (count === 0) {
            return respuesta.status(404).json({ error: "Peli no encontrada" });
        }
        respuesta.status(204).send();
    } catch (error) {
        respuesta.status(500)

        respuesta.json({ error : "Error en el servidor" });
    }
});


// Crear un nuevo usuario
servidor.post("/registro", async (peticion, respuesta) => {
    const { usuario, contraseña } = peticion.body;

    try {
        const conexion = await MongoClient.connect(urlMongo);
        const baseDatos = conexion.db("mispelis");
        const usuarios = baseDatos.collection("usuariosmp");

        // Verificamos si el usuario ya existe
        const existente = await usuarios.findOne({ usuario });

        if (existente) {
            conexion.close();
            return respuesta.status(400).json({ error: "Ese nombre de usuario ya existe" });
        }

        // Si no existe, lo insertamos
        const resultado = await usuarios.insertOne({ usuario, contraseña });
        conexion.close();
        respuesta.status(201).json({ mensaje: "Usuario creado con éxito", usuario });
    } catch (error) {
        respuesta.status(500)

        respuesta.json({ error : "Error en el servidor" });
    }
});


servidor.listen(process.env.PORT);