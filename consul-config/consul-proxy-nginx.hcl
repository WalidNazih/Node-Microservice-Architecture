consul {
    address = "localhost:8500"
    retry {
        enabled = true
        attempts = 12
        backoff = "250ms"
    }
}
template {
    source      = "C:/Users/ANON/Desktop/nginx/conf/nginx.conf.ctmpl"
    destination = "C:/Users/ANON/Desktop/nginx/conf/nginx.conf"
}