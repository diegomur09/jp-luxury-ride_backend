// Ambient module to satisfy TypeScript when using the Square SDK.
// Declared for 'square' to match the installed package.
declare module 'square' {
  export class Client {
    constructor(config: { accessToken: string; environment: any })
    paymentsApi: any
    customersApi: any
    ordersApi: any
    invoicesApi: any
    refundsApi: any
  }

  export const Environment: {
    Production: any
    Sandbox: any
  }
}

