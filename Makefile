.PHONY: all
all: fmt lint clean build

lint:
	deno lint

build:
	deno compile -o ./neko src/main.ts

clean:
	rm neko

cache:
	deno cache src/*.ts

fmt:
	deno fmt