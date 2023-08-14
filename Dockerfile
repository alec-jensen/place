# syntax=docker/dockerfile:1

FROM golang:1.21-alpine

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . ./

RUN go build -o /place ./cmd/place/place.go

EXPOSE 80

CMD ["/place"]