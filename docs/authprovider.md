# Authentication provider

This suite of commands allows you to manipulate your Espresso Logic projects. Please see our [Wiki] (https://github.com/EspressoLogicCafe/StormpathAuthProvider/wiki/Installation-of-a-Custom-Authentication-Provider) for details on how to create and install a custom authentication provider (e.g. Active Directory, LDAP, SQL, LDAP, Stormpath, etc.)

***
## Project list
    espressoadmin authprovider list

The `list` command shows all authentication providers for the current account.

#### Output
    All authentication providers
    Ident  Name                                                       Comments
    -----  ---------------------------------------------------------  --------
    1000   Built-in authentication (dblocal_admin - dblocal_usrtbls)
    
    # authentication providers: 1

The `list` command is currently the only one available from the command line for
authentication providers.
