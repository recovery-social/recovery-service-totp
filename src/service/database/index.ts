import { db } from "./firebase"


export const get = (collection: string, id: string) => {

    return db.collection(collection).doc(id).get().then((doc) => {
        if (doc.exists) {
            return doc.data()
        } else {
            return null
        }
    })
}

export const set = (collection: string, id: string, body: any) => {

    return db.collection(collection).doc(id).set(body)
}