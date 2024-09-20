import { SshAuthenticationType, SshClientCredentials, SshClientSession, SshSessionConfiguration } from "@microsoft/dev-tunnels-ssh";
import { SshClient } from "@microsoft/dev-tunnels-ssh-tcp";
import { ensureSshKeys } from "./ensureSshKeys";
import { KeyData, Pkcs8KeyFormatter } from "@microsoft/dev-tunnels-ssh-keys";

export async function connectSession(): Promise<SshClientSession> {
    const client = new SshClient(new SshSessionConfiguration());
    const session = await client.openSession('localhost', 2222)

    session.onAuthenticating((e) => {
        if (
            e.authenticationType !== SshAuthenticationType.serverPublicKey
        ) {
            return;
        }
        e.authenticationPromise = (async (): Promise<object | null> => {
            return {};
        })();
    });

    const privateKey = await ensureSshKeys();

    const formatter = new Pkcs8KeyFormatter();
    const keyData = KeyData.tryDecodePem(privateKey);
    const keypair = await formatter.import(keyData);
    const credentials: SshClientCredentials = {
        username: "codespace",
        publicKeys: [keypair!],
    };

    const authResult = await session.authenticate(credentials);
    if (!authResult) {
        throw new Error("Failed to authenticate");
    }

    return session;
}