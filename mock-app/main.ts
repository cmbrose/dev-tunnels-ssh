import { CommandRequestMessage, SshExtendedDataType } from "@microsoft/dev-tunnels-ssh";
import { ChannelSignalMessage } from "@microsoft/dev-tunnels-ssh/messages/connectionMessages";
import { connectSession } from "./connectSession";

async function main(): Promise<void> {
    const session = await connectSession();
    const channel = await session.openChannel();

    channel.onDataReceived(e => console.log(`STDOUT: ${e.toString("utf-8")}`));
    
    channel.onExtendedDataReceived(e => {
        if (e.dataTypeCode !== SshExtendedDataType.STDERR) {
            return
        }
        
        console.log(`STDERR: ${e.toString()}`);
    });

    channel.onClosed(e => console.log(`CLOSED: ${JSON.stringify(e)}`));

    const execRequestMessage = new CommandRequestMessage();
    execRequestMessage.command = 'cd /workspaces/dev-tunnels-ssh/mock-app/express-app && npm run start';
    channel.request(execRequestMessage);

    const sendSignal = async (signal: 'INT' | 'TERM' | 'KILL') => {
        const signalMessage = new ChannelSignalMessage();
        signalMessage.recipientChannel = channel.remoteChannelId;
        signalMessage.signal = signal;
        await session.sendMessage(signalMessage);
    };

    const stdin = process.openStdin();

    stdin.addListener("data", async function(d) {
        const c = d.toString().trim();

        if (c === 'q') {
            console.log("closing and exiting");
            await channel.close();
            process.exit(0)
        } else if (c === 'i') {
            console.log("sending sigint");
            await sendSignal('INT');
        } else if (c === 't') {
            console.log("sending sigterm");
            await sendSignal('TERM');
        } else if (c === 'k') {
            console.log("sending sigkill");
            await sendSignal('KILL');
        }
    });
}

main()