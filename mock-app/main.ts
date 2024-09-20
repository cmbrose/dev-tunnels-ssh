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

    const stdin = process.openStdin();

    stdin.addListener("data", async function(d) {
        const c = d.toString().trim();

        if (c === 'q') {
            console.log("sending close");
            const closeResult = await channel.close();
            console.log(`closeResult: ${closeResult}`)

            console.log("exiting");
            process.exit(0)
        }
        if (c === 'i') {
            console.log("sending sigint");

            const signalMessage = new ChannelSignalMessage();
			signalMessage.recipientChannel = channel.remoteChannelId;
			signalMessage.signal = 'INT';
			const sigintResult = await session.sendMessage(signalMessage);

            console.log(`sigintResult: ${sigintResult}`)
        }
        if (c === 't') {
            console.log("sending sigterm");

            const signalMessage = new ChannelSignalMessage();
			signalMessage.recipientChannel = channel.remoteChannelId;
			signalMessage.signal = 'TERM';
			const sigintResult = await session.sendMessage(signalMessage);

            console.log(`sigintResult: ${sigintResult}`)
        }
        if (c === 'k') {
            console.log("sending sigkill");

            const signalMessage = new ChannelSignalMessage();
			signalMessage.recipientChannel = channel.remoteChannelId;
			signalMessage.signal = 'KILL';
			const sigintResult = await session.sendMessage(signalMessage);

            console.log(`sigintResult: ${sigintResult}`)
        }
    });
}

main()