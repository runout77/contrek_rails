# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin "@googlemaps/js-api-loader", to: "@googlemaps--js-api-loader.js" # @1.16.8
pin "html2canvas" # @1.4.1
pin "jquery" # @3.7.1
