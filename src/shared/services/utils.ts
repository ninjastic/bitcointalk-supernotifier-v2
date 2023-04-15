import bs58 from 'bs58';
import JSsha from 'jssha';

const sha256 = (str: string) => {
  const inst = new JSsha('SHA-256', 'HEX');
  inst.update(str);
  return inst.getHash('HEX');
};

export function validateTronAddress(addressBase58Check: string) {
  try {
    if (typeof addressBase58Check !== 'string' || addressBase58Check.length !== 34) return false;
    const bytes = Buffer.from(bs58.decode(addressBase58Check));
    const checkSum = Buffer.from(bytes.subarray(bytes.length - 4)).toString('hex');
    const addressWithoutCheckSum = Buffer.from(bytes.subarray(0, bytes.length - 4)).toString('hex');
    const doubleHash = sha256(sha256(addressWithoutCheckSum));
    const expectedCheckSum = doubleHash.slice(0, 8);
    return expectedCheckSum === checkSum;
  } catch (e) {
    return false;
  }
}
