# Neko

A small command line tool to export and analyze balance transfers on a Substrate
based blockchain.

## Installation

Assuming you have [`deno`](https://deno.land/) installed, simply use the command
below:

```
deno install https://raw.githubusercontent.com/ETeissonniere/neko/main/src/main.ts
```

## Usage

Use `neko help` to see more commands and options :smile:.

### Generate an export

You first need to export the transfers to a local CSV.

```
neko fetch -d ./out.csv -u $URL_TO_WSRPC --start $START_BLOCK --end $END_BLOCK
```

### Extract some form of analysis

This will display the top receivers and senders for your export.

```
neko report -d ./out.csv
```
