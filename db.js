import dotenv from "dotenv";
dotenv.config();
import { MongoClient, ObjectId } from "mongodb";

const urlMongo = process.env.DB_URL

async function conectar() {
    const cliente = new MongoClient(urlMongo);
    await cliente.connect();
    const db = cliente.db("mispelis");
    return { cliente, db };
}

// Exportación de la función asíncrona "guardarPeli" para usarla en el index.js
// Permite guardar pelis en la bbdd de Mongo Atlas
export async function guardarPeli(peli) {
    let cliente;

    try {
        // Conexión a la base de datos
        const conexion = await conectar();
        cliente = conexion.cliente;
        const db = conexion.db;
        const coleccion = db.collection("pelis");

        // Busca en la colección un documento que tenga el mismo usuario y el mismo título que la peli recibida
        const existente = await coleccion.findOne({
            usuario: peli.usuario,
            title: peli.title || peli.titulo,
        });

        if (existente) {
            // Si la peli ya existe, actualizamos los tipos
            const nuevosTipos = Array.from(new Set([...existente.tipo, ...peli.tipo]));

            await coleccion.updateOne(
                { _id: existente._id },
                { $set: { tipo: nuevosTipos } }
            );

        } else {
            // Si no existe, se añade la peli en la colección
            const resultado = await coleccion.insertOne(peli);
            // Se genera un _id para la peli
            peli._id = resultado.insertedId; //
            return peli;
        }
    } catch (error) {
        return { error: "Error al guardar la peli" };
    }
}


// Función para cambiar la categoría de una peli (de "favorita" a "vista" o viceversa)
export async function cambiarCategoria(id, nuevoTipo) {
    let cliente;

    try {
        // Conectamos a la base de datos
        const conexion = await conectar();
        cliente = conexion.cliente;
        const db = conexion.db;
        const coleccion = db.collection("pelis");

        // Actualizamos el tipo de la película
        const resultado = await coleccion.updateOne(
            { _id: new ObjectId(id) },
            { $set: { tipo: nuevoTipo } }
        );

        // Si se modifica una peli, la buscamos y la devolvemos
        if (resultado.modifiedCount === 1) {
            const peliActualizada = await coleccion.findOne({ _id: new ObjectId(id) });
            // Cierra la conexión y nos devuelve la peli actualizada
            await cliente.close();
            return peliActualizada;
        } else {
            // Cierra la conexión aunque no se encuentre
            await cliente.close();
            return null;
        }
    } catch (error) {
        console.error("Error al cambiar categoría:", error);
        if (cliente) {
            await cliente.close();
        }
        return null;
    }
}


// Función para borrar pelis de la base de datos
export async function borrarPeli(id){
    return new Promise((ok, ko) => {
        MongoClient.connect(urlMongo)
        .then(conexion => {
            let coleccion = conexion.db("mispelis").collection("pelis");

            coleccion.deleteOne({ _id: new ObjectId(id) })
            .then(({ deletedCount }) => {
                conexion.close();
                ok(deletedCount);
            })
            .catch(() => {
                conexion.close();
                ko({ error: "error en base de datos" });
            });
        })
        .catch((error) => {
            console.error("Error en la base de datos:", error);
            conexion.close();
            ko({ error: "error en base de datos" });
        });
    });
}