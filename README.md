# Sign

Open a PDF or image in the browser, draw a signature with the mouse, drag it
onto the page and print. Documents stay in browser memory and are never uploaded.

## Development

```sh
npm install
npm run dev
```

## Docker

```sh
docker run -p 8080:80 drnatejones/sign
```

Serves plain HTTP with no HTTPS redirect, so it works on any host port and on
LAN addresses. To change the port nginx listens on inside the container (for
hosts that set `PORT`):

```sh
docker run -p 3000:3000 -e PORT=3000 drnatejones/sign
```

### NAS / Docker Compose

Copy [docker-compose.yml](docker-compose.yml) into your NAS's container app
(Synology Container Manager → Project, QNAP Container Station → Applications,
Portainer → Stacks, TrueNAS → Custom App) and open `http://<nas-ip>:8090`.
Change the left side of `8090:80` if that port is taken.

## Releasing

Push a `vX.Y.Z` tag. The release workflow publishes `drnatejones/sign` to
Docker Hub and creates a GitHub release. It needs a `DOCKERHUB_TOKEN` repo secret.
