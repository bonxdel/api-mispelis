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
        // Se conecta a la base de datos
        const conexion = await MongoClient.connect(urlMongo);
        const baseDatos = conexion.db("mispelis");
        const usuarios = baseDatos.collection("usuariosmp");

        const encontrado = await usuarios.findOne({ usuario });

        // Si no encuentra el usuario en la base de datos, se notifica
        if (!encontrado) {
            return respuesta.status(400).json({ error: "Usuario no encontrado" });
        }

        // Si la contraseña introducida en login es incorrecta, se notifica
        if (encontrado.contraseña !== contraseña) {
            return respuesta.status(400).json({ error: "Contraseña incorrecta" });
        }

        // Respuesta en caso de que todo funcione
        conexion.close();
        respuesta.json({ mensaje: "Acceso concedido", usuario: encontrado.usuario });

    } catch (error) {
        respuesta.status(500);
        respuesta.json({ error : "Error en el servidor" });
    }
});


// Middleware para obtener las pelis del usuario
servidor.get("/mispelis/:usuario/:tipo", async (peticion, respuesta) => {
    const usuario = peticion.params.usuario;
    const tipo = peticion.params.tipo;

    // Si no se ha encontrado el usuario:
    if (!usuario) {
        return respuesta.status(400).json({ error: "Usuario no autenticado" });
    }

    try {
        // Conexión a la base de datos
        const conexion = await MongoClient.connect(urlMongo);
        const baseDatos = conexion.db("mispelis");
        const coleccion = baseDatos.collection("pelis");

        // Se accede a la colección "pelis"
        // Busca en ella los elementos que coincidan con el usuario y tipo seleccionados
        const peliculas = await coleccion.find({ usuario: usuario, tipo: tipo }).toArray();
        respuesta.json(peliculas);

        conexion.close();
    } catch (error) {
        respuesta.status(500)

        respuesta.json({ error : "Error en el servidor" });
    }
});


// Middleware para añadir una peli con el tipo "favorita" a la bbdd
servidor.post("/pelifavorita", async (peticion, respuesta) => {
    const peli = peticion.body;
    const { usuario } = peticion.body;

    // Si no se ha encontrado el usuario:
    if (!usuario) {
        return respuesta.status(400).json({ error: "Usuario no autenticado" });
    }

    try {
        // Asocia la peli al usuario logueado
        peli.usuario = usuario;
        const nueva = await guardarPeli(peli);
        respuesta.status(200)
        
        respuesta.json(nueva);
    } catch (error) {
        respuesta.status(500);

        respuesta.json({ error : "Error en el servidor" });
    }
});



// Middleware para añadir una peli con el tipo "vista" a la bbdd
servidor.post("/pelivista", async (peticion, respuesta) => {
    const peli = peticion.body;
    const { usuario } = peticion.body; // Recibimos el usuario desde el cuerpo de la solicitud

    // Si no se ha encontrado el usuario:
    if (!usuario) {
        return respuesta.status(400).json({ error: "Usuario no autenticado" });
    }
    try {
        // Asocia la peli al usuario logueado
        peli.usuario = usuario;
        const nueva = await guardarPeli(peli);
        respuesta.status(200)
        
        respuesta.json(nueva);
    } catch (error) {
        respuesta.status(500);

        respuesta.json({ error : "Error en el servidor" });
    }
});


// Middleware para cambiar la categoría de una peli
servidor.put("/cambiarcategoria/:id([0-9a-f]{24})", async (peticion, respuesta) => {
    const { tipo } = peticion.body;
    const { id } = peticion.params;

    try {
        // Se cambia la categoría obteniendo el id y el tipo del ítem
        const peliActualizada = await cambiarCategoria(id, tipo);

        // Respuesta si la peli no se encuentra
        if (!peliActualizada) {
            return respuesta.status(404).json({ error: "Película no encontrada" });
        }

        // Si todo sale bien, se recibe un 200 y se actualiza el tipo de la peli
        respuesta.status(200).json(peliActualizada);
    } catch (error) {
        respuesta.status(500);

        respuesta.json({ error : "Error en el servidor" });
    }
});
           

// Middleware para eliminar pelis de la bd
servidor.delete("/borrarpeli/:id([0-9a-f]{24})", async (peticion, respuesta) => {    
    const { id } = peticion.params;
    try {
        // Llama a la función borrarPeli pasando el id
        let count = await borrarPeli(id);

        // Si no se ha borrado ninguna peli, se devuelve un 404
        if (count === 0) {
            return respuesta.status(404).json({ error: "Peli no encontrada" });
        }

        // Si ha funcionado correctamente, devuelve un 204 (sin contenido)
        respuesta.status(204);
        respuesta.send();

    } catch (error) {
        respuesta.status(500);
        respuesta.json({ error : "Error en el servidor" });
    }
});


// Crear un nuevo usuario
servidor.post("/registro", async (peticion, respuesta) => {
    const { usuario, contraseña } = peticion.body;

    try {
        // Conexión a la base de datos
        const conexion = await MongoClient.connect(urlMongo);
        const baseDatos = conexion.db("mispelis");
        const usuarios = baseDatos.collection("usuariosmp");

        // Verifica si el usuario ya existe
        const existente = await usuarios.findOne({ usuario });

        // Si existe, se cierra la conexión y se avisa de que ya existe
        if (existente) {
            conexion.close();
            return respuesta.status(400).json({ error: "El nombre de usuario ya existe" });
        }

        // Si no existe, lo añade con sus campos "usuario" y "contraseña"
        const resultado = await usuarios.insertOne({ usuario, contraseña });
        conexion.close();
        respuesta.status(201);
        respuesta.json({ mensaje: "Usuario creado con éxito", usuario });

    } catch (error) {
        respuesta.status(500);
        respuesta.json({ error : "Error en el servidor" });
    }
});


// Middlewares para manejo de errores
servidor.use((error,peticion,respuesta,siguiente) => {
    respuesta.status(400);
    respuesta.json({ error : "error en la petición" });
});


servidor.use((peticion,respuesta) => {
    respuesta.status(404);
    respuesta.json({ error : "recurso no encontrado" });
});


servidor.listen(process.env.PORT);