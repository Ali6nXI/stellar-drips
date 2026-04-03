// Stellar SDK + Freighter integration
import { requestAccess, setAllowed } from "@stellar/freighter-api";

export async function connectWallet() {
    let allowed = await setAllowed();
    if (allowed) {
        let pubKey = await requestAccess();
        return pubKey;
    }
    return null;
}
