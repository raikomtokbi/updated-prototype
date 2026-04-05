declare module "imap-simple" {
  export interface ImapConfig {
    imap: {
      user: string;
      password: string;
      host: string;
      port: number;
      tls: boolean;
      authTimeout?: number;
      connTimeout?: number;
      tlsOptions?: Record<string, any>;
    };
  }

  export interface MessagePart {
    which: string;
    size?: number;
    body: any;
  }

  export interface Message {
    attributes: Record<string, any>;
    parts: MessagePart[];
  }

  export interface ImapSimple {
    openBox(boxName: string): Promise<void>;
    search(searchCriteria: any[], fetchOptions: { bodies: string[]; markSeen?: boolean }): Promise<Message[]>;
    end(): void;
  }

  export function connect(config: ImapConfig): Promise<ImapSimple>;
}
