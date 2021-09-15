const axios = require("axios").default
let lastRedirectUrl;

if (process.argv.length < 3) {
    console.log('No password provided')
    return process.exit(1)
}

const password = process.argv[2]

function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < 4; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

function checkConnection() {
    return axios.get('http://clients1.google.com/generate_204')
        .then(
            response => {
                if (response.status == 204) return true
                if (typeof response.data == 'string') {
                    const match = response.data.match(/URL=(?<url>.*?)"/)
                    if (match.groups.url) {
                        lastRedirectUrl = match.groups.url
                        return false
                    }
                }

                return Promise.reject(`Unhandled response status ${response.status}: ${response.data}`)
            }
        )
}


async function doLogin() {
    //get login URL
    return axios.get(lastRedirectUrl, {
        maxRedirects: 0
    }).then(response => {

        let match = response.data.match(/^[^/]+val\(username\+'\.'\+makeId\+'(?<sufix>.*?)'\);/m)
        if (!match || !match.groups.sufix) {
            console.error('Cannot read login data sufix', response.data)
            return false
        }
        const sufix = match.groups.sufix
        match = response.data.match(/^\s+url: '(?<url>.+?)'/m)
        if (!match || !match.groups.url) {
            console.error('Cannot read login url', response.data)
            return false
        }

        const domain = lastRedirectUrl.match(/^(https?:\/\/.+?)\?/)[1]
        const url = domain + match.groups.url

        const loginData = {
            username_: password,
            autologin_time: 120,//86000,
            username: `${password}.${makeid()}${sufix}`,
            password: password,
        }

        const loginPost = Object.keys(loginData).map(
            k => `${k}=${encodeURIComponent(loginData[k])}`
        ).join('&')
        return axios.post(url, loginPost, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                Origin: 'http://welcome2.wifi.id',
                Referer: lastRedirectUrl
            }
        }).then(
            res => {
                if (res.data.result) {
                    console.log(res.data.message)
                } else {
                    console.log('Login Gagal', res.data)
                }
            }
        )
    }).catch(
        err => {
            if (err.response.status == 302) {
                console.log('OK, Login cached..')
                return true
            }
        }
    )
}

async function main() {
    let ok;
    try {
        ok = await checkConnection()
        if (!ok) {
            console.log(new Date().toLocaleString(), 'Autologin..')
            await doLogin()
        }
    } catch (error) {
        console.log('ERROR', error.message)
    }
    setTimeout(main, 5000)
}
console.log('Watching internet connection..')
main()