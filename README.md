# EMURGO Backend Engineer Challenge

## Overview
This project is an API for tracking blockchain addresses' balances using a UTXO-based model. It provides the following endpoints:
   - `POST /blocks`: Accepts a block, validates it, and updates balances.
   - `GET /balance/:address`: Returns the balance of the given address.
   - `POST /rollback?height=number`: Rolls back to a specific block height and recalculates balances.

## Setup
1. Install Docker and Docker Compose:
    - https://docs.docker.com/engine/install/
    - https://docs.docker.com/compose/install/


2. Create an `.env` file based on the `.env.example` file:
```sh
cp .env.example .env
```
Fill in the required environment variables in the .env file, such as database and web server ENVs.

3. Clone the repository:

```bash
git clone https://github.com/sirAlif/emurgo-backend-engineer-test
cd backend-engineer-test
```

4. Run the project:

- Using Bun:
```bash
bun run-docker
```

- Using Docker:
```bash
docker-compose up -d --build
```

5. Monitor web server logs:

- Using Bun:
```bash
bun logs
```

- Using Docker:
```bash
docker-compose logs -f api
```

6. Stop the project:

- Using Bun:
```bash
bun stop-docker
```

- Using Docker:
```bash
docker-compose down
```

7. Run tests:
```bash
bun install && bun test
```

## API Endpoints

### POST /blocks
- Request Body Example:
```bash
{
  "id": "d1582b9e2cac15e170c39ef2e85855ffd7e6a820550a8ca16a2f016d366503dc",
  "height": 1,
  "transactions": [
    {
      "id": "tx1",
      "inputs": [],
      "outputs": [
        {
          "address": "addr1",
          "value": 10
        }
      ]
    }
  ]
}
```

- Response Example:
```bash
{
  "message": "Block processed successfully"
}
```

### GET /balance/:address
- Response Example:
```bash
{
  "balance": "10.00000000"
}
```

### POST /rollback?height=number
- Response Example:
```bash
{
  "message": "Rollback successful"
}
```