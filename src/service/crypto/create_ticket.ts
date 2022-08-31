
const {
  keccak256,
  toBuffer,
  ecsign,
  bufferToHex,
} = require("ethereumjs-utils");
import { ethers } from 'ethers';





function createTicket(hash: any, signerPvtKey: any) {
  return ecsign(hash, signerPvtKey);
}

function generateHashBuffer(typesArray: any, valueArray: any) {
  return keccak256(
    toBuffer(ethers.utils.defaultAbiCoder.encode(typesArray,
      valueArray))
  );
}

function serializeTicket(ticket: any) {
  return {
    r: bufferToHex(ticket.r),
    s: bufferToHex(ticket.s),
    v: ticket.v,
  };
}

export const createTicketForRecovery = (newAccount: string, signerPvtKey: string) => {
  // unwichtig
  //   const signerAddress = '0x691B1eF0EaBAE1909BfDC878a04F7e550d51e243'
  // const signerPvtKey = Buffer.from('aa21d57fedbec83352efc870751178dfcaacead38ac0199faabb3346f2f0f316', 'hex')

  const privateKey = Buffer.from(signerPvtKey, 'hex')

  const hashBuffer = generateHashBuffer(
    ["address"],
    [newAccount]
  );
  const ticket = createTicket(hashBuffer, privateKey);

  return { ticket }
}





