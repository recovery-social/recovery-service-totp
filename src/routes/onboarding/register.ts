
import { FastifyReply, FastifyRequest } from "fastify"
import { createPrivatePublicKey } from "../../service/crypto/create_private_public_key"
import { get, set } from "../../service/database"
import { generateSecret, getQrCodeUrl } from "../../service/crypto/totp"
import { ERC725 } from '@erc725/erc725.js';
import LSP6 from '@erc725/erc725.js/schemas/LSP6KeyManager.json';
import Web3 from "web3";

const provider = new Web3.providers.HttpProvider(
  'https://rpc.l16.lukso.network',
);
const config = {
  ipfsGateway: 'https://2eff.lukso.dev/ipfs/',
};

const web3 = new Web3(provider)

export const handler = async (request: FastifyRequest, reply: FastifyReply) => {
  const { LSP11ContractAddress, signature } = request.body as any
  //test
  if (!LSP11ContractAddress) {
    return reply.status(400).send({ error: 'LSP11ContractAddress not provided' })
  }

  if (!signature) {
    return reply.status(400).send({ error: 'signature not provided' })
  }

  const now = new Date()
  const seconds = Math.round(now.getSeconds() / 10) * 10;
  const message1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), seconds).getTime()

  const message2 = message1 - 10000 //go 10 seconds back to last timewindow

  const prefix = 'To sign in, please sign this message to confirm your identity. '

  let matchingAddress
  let finalMessage = ''
  const signingAddressCurrent = web3.eth.accounts.recover(
    prefix + message1.toString(),
    signature.signature
  );
  if (signingAddressCurrent == signature.address) {
    matchingAddress = signingAddressCurrent
    finalMessage = prefix + message1.toString()
  }

  const signingAddressLast = web3.eth.accounts.recover(
    prefix + message2.toString(),
    signature.signature
  );
  if (signingAddressLast == signature.address) {
    finalMessage = prefix + message2.toString()

    matchingAddress = signingAddressLast
  }
  if (!matchingAddress) {
    return reply.status(400).send({ error: 'Signature not valid' })
  }

  let hasPermission = await checkifEOAisAllowed(LSP11ContractAddress, signature, finalMessage)

  console.log('hasPermission', hasPermission)

  if (!hasPermission) {
    return reply.status(400).send({ error: 'Signing account has no permission to edit the LSP11 Address' })
  }

  console.log('LSP11ContractAddress', LSP11ContractAddress)

  const user = await get('LSP11ContractAddresses', LSP11ContractAddress)
  let totpSecret = user?.totpSecret
  console.log('user', user)

  if (!user) {
    const { pubKeyString, pvtKeyString } = createPrivatePublicKey()
    totpSecret = generateSecret()
    console.log('secret', totpSecret)
    await set('LSP11ContractAddresses', LSP11ContractAddress, {
      pubKeyString,
      pvtKeyString,
      totpSecret: totpSecret
    })
  }

  const qrcode = getQrCodeUrl(totpSecret, LSP11ContractAddress, 'totp.recovery.social')

  return { qrcode }
}


const checkifEOAisAllowed = (lsp11ContractAddress: string, signature: any, message: string): Promise<boolean> => new Promise(resolve => {

  const LSP11ContractABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_account",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "secret",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "threshold",
          "type": "uint256"
        },
        {
          "internalType": "address[]",
          "name": "guardians",
          "type": "address[]"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "account",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newGuardian",
          "type": "address"
        }
      ],
      "name": "addGuardian",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "rsContractAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "publicKey",
          "type": "address"
        }
      ],
      "name": "addRecoveryServiceGuardian",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "recoverProcessId",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "guardian",
          "type": "address"
        }
      ],
      "name": "getGuardianVote",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getGuardians",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getGuardiansThreshold",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getOwner",
      "outputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getRecoverProcessesIds",
      "outputs": [
        {
          "internalType": "bytes32[]",
          "name": "",
          "type": "bytes32[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getRecoveryServiceGuardians",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_address",
          "type": "address"
        }
      ],
      "name": "isGuardian",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "recoverProcessId",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "singleHashtSecret",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "newHash",
          "type": "bytes32"
        }
      ],
      "name": "recoverOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "currentGuardian",
          "type": "address"
        }
      ],
      "name": "removeGuardian",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "rsAddress",
          "type": "address"
        }
      ],
      "name": "removeRecoveryServiceGuardian",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "newHash",
          "type": "bytes32"
        }
      ],
      "name": "setSecret",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "newThreshold",
          "type": "uint256"
        }
      ],
      "name": "setThreshold",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "_interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "recoverProcessId",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "voteToRecover",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "rsContractAddress",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "recoverProcessId",
          "type": "bytes32"
        },
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "r",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "s",
              "type": "bytes32"
            },
            {
              "internalType": "uint8",
              "name": "v",
              "type": "uint8"
            }
          ],
          "internalType": "struct TicketLib.Ticket",
          "name": "ticket",
          "type": "tuple"
        }
      ],
      "name": "voteToRecoverRecoveryService",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    }
  ]



  var LSP11 = new web3.eth.Contract(LSP11ContractABI as any, lsp11ContractAddress);

  LSP11.methods.getOwner().call()
    .then((owner: any) => {

      console.log('owner', owner)

      const upAddress = owner;
      const erc725 = new ERC725(LSP6 as any, upAddress, provider, config);

      erc725.isValidSignature(message, signature.signature).then((response: any) => {
        console.log('signature response', response);
        resolve(response)
      }).catch(error => {
        return resolve(false)
      })

    }).catch((error: any) => {
      console.log(error)
      return resolve(false)
    })
})