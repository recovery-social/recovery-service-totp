import { FastifyReply, FastifyRequest } from "fastify"
import { createTicketForRecovery } from "../../service/crypto/create_ticket"
import { get } from "../../service/database"
import { verify } from "../../service/crypto/totp"

export const handler = async (request: FastifyRequest, reply: FastifyReply) => {

    const { LSP11ContractAddress, newOwner, token } = request.body as any

    if(!LSP11ContractAddress || !newOwner || !token) {
        return reply.status(400).send({ error: 'missing parameters' })
    }

    const user = await get('LSP11ContractAddresses', LSP11ContractAddress)

    if (!user) {
        return reply.status(400).send({ error: 'LSP11ContractAddress not found' })
    }

    const isVerified = verify(user.totpSecret, token, new Date())

    if (isVerified) {
        const { ticket } = createTicketForRecovery(newOwner, user.pvtKeyString)

        return { ticket }
    } else {
        return reply.code(401).send({ error: 'not verified' })
    }


}