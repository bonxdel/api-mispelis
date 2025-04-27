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
        const conexion = await conectar();
        cliente = conexion.cliente;
        const db = conexion.db;
        const coleccion = db.collection("pelis");

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
            // Si no existe, insertamos la peli
            const resultado = await coleccion.insertOne(peli);
            peli._id = resultado.insertedId; // Aquí le asignamos el _id generado
            return peli; // Devolvemos el objeto peli completo con _id
        }
        return { mensaje: "Película guardada" };

    } catch (error) {
        return { error: "Error al guardar la peli" };
    } finally {
        if (cliente) await cliente.close();
    }
}


// Función para cambiar la categoría de una peli (de "favorita" a "vista" o viceversa)
export async function cambiarCategoria(id, nuevoTipo) {
    let cliente;

    try {
        const conexion = await conectar(); // Conectamos a la base de datos
        cliente = conexion.cliente;
        const db = conexion.db;
        const coleccion = db.collection("pelis");

        // Actualizamos el tipo de la película
        const resultado = await coleccion.updateOne(
            { _id: new ObjectId(id) },
            { $set: { tipo: nuevoTipo } }
        );

        // Si se modificó una película, la buscamos y la devolvemos
        if (resultado.modifiedCount === 1) {
            const peliActualizada = await coleccion.findOne({ _id: new ObjectId(id) });
            await cliente.close(); // Cerramos conexión después de éxito
            return peliActualizada;
        } else {
            await cliente.close(); // Cerramos conexión aunque no encuentre
            return null;
        }
    } catch (error) {
        console.error("❌ Error al cambiar categoría:", error);
        if (cliente) {
            await cliente.close(); // Cerramos conexión en caso de error
        }
        return null;
    }
}


// Función para borrar pelis de la bd
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