import spawn from 'cross-spawn';
import { Observable, Subscriber } from 'rxjs';
import _ from 'underscore';

export function spawn$(command: string): Observable<string> {
    return new Observable<string>((subscriber: Subscriber<string>) => {
        const commands = command.split(' && ');

        let stack: Promise<string> = Promise.resolve('');

        _.each(
            commands,
            (command: string): void => {
                stack = stack
                    .then(output => {
                        subscriber.next(output);
                        return processCommand(command);
                    })
                    .catch(error => {
                        subscriber.error(error);

                        return Promise.reject(error);
                    });
            }
        );

        stack.then(() => subscriber.complete()).catch(() => subscriber.complete());
    });

    function processCommand(command: string): Promise<string> {
        return new Promise<string>(
            (resolve, reject): void => {
                const cmd_args = command.split(' ');
                const cmd: string = cmd_args.shift() || command;

                const child = spawn(cmd, cmd_args);

                let output = `> ${command}\n\n`;
                process.stdout.write(output);

                if(child.stderr !== null) {
                    child.stderr.on('data', (err: string) => {
                        process.stdout.write(err.toString());

                        output += err;
                    });
                }

                if(child.stdout !== null) {
                    child.stdout.on('data', (chunk: string) => {
                        process.stdout.write(chunk.toString());

                        output += chunk;
                    });
                }

                child.on('error', (err: Error) => {
                    reject(output);
                });

                child.on('exit', (code: number, signal: string) => {
                    if (code === 0) {
                        resolve(output);
                    } else {
                        reject(output);
                    }
                });
            }
        );
    }
}
