<?php
declare(strict_types=1);

final class Router
{
    /** @var array<string, callable> */
    private array $routes = [];
    /** @var array<int, array{method: string, regex: string, params: array<int, string>, handler: callable}> */
    private array $patternRoutes = [];

    public function get(string $path, callable $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    public function post(string $path, callable $handler): void
    {
        $this->add('POST', $path, $handler);
    }

    public function put(string $path, callable $handler): void
    {
        $this->add('PUT', $path, $handler);
    }

    public function delete(string $path, callable $handler): void
    {
        $this->add('DELETE', $path, $handler);
    }

    public function dispatch(string $method, string $path): void
    {
        $key = strtoupper($method) . ' ' . $path;
        if (!isset($this->routes[$key])) {
            foreach ($this->patternRoutes as $route) {
                if ($route['method'] !== strtoupper($method)) {
                    continue;
                }

                if (preg_match($route['regex'], $path, $matches) === 1) {
                    $params = [];
                    foreach ($route['params'] as $name) {
                        $params[$name] = $matches[$name] ?? null;
                    }
                    ($route['handler'])($params);
                    return;
                }
            }

            Response::json(['error' => 'Not found'], 404);
        }

        ($this->routes[$key])();
    }

    private function add(string $method, string $path, callable $handler): void
    {
        $normalizedPath = '/' . ltrim($path, '/');
        if (str_contains($normalizedPath, ':')) {
            $paramNames = [];
            $parts = explode('/', trim($normalizedPath, '/'));
            $regexParts = [];
            foreach ($parts as $part) {
                if (str_starts_with($part, ':')) {
                    $name = substr($part, 1);
                    if (preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $name) === 1) {
                        $paramNames[] = $name;
                        $regexParts[] = '(?P<' . $name . '>[^/]+)';
                        continue;
                    }
                }
                $regexParts[] = preg_quote($part, '#');
            }

            $regex = '#^/' . implode('/', $regexParts) . '$#';
            $this->patternRoutes[] = [
                'method' => strtoupper($method),
                'regex' => $regex,
                'params' => $paramNames,
                'handler' => $handler,
            ];
            return;
        }

        $key = strtoupper($method) . ' ' . $normalizedPath;
        $this->routes[$key] = $handler;
    }
}
