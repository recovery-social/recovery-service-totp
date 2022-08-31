
import { FastifyReply, FastifyRequest } from "fastify"
import { get } from "../../service/database"
import { verify } from "../../service/crypto/totp"

export const handler = async (request: FastifyRequest, reply: FastifyReply) => {

    const { LSP11ContractAddress, token } = request.body as any

    const user = await get('LSP11ContractAddresses', LSP11ContractAddress)

    if (!user) {
        return reply.status(400).send({ error: 'LSP11ContractAddress not found' })
    }

    const isVerified = verify(user.totpSecret, token, new Date())

    if (isVerified) {
        return { verified: true, pubKeyString: user.pubKeyString }
    } else {
        return reply.code(401).send({ error: 'not verified' })
    }
}