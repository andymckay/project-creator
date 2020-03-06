let token = process.env.INPUT_TOKEN;
let fs = require('fs');
let https = require('https');
let destination = process.env.INPUT_DESTINATION;
let structure = JSON.parse(fs.readFileSync(process.env.INPUT_FILE));

function call(url, data) {
    let json = JSON.stringify(data);
    let options = {
        'headers': {
            'Accept': 'application/vnd.github.inertia-preview+json',
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'actions/create-project',
            'Content-Length': Buffer.byteLength(json)
        },
        'host': 'api.github.com',
        'path': url,
        'method': 'POST'
    }

    return new Promise((resolve, reject) => {
        let post = https.request(options, (res) => {
            let data = "";
            if (res.statusCode !== 201) {
                console.log(`Got an error: ${res.statusCode}`)
                process.exit(1);
            }
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                data += chunk;
            })
            res.on('end', function () {
                resolve(JSON.parse(data));
            });
            res.on('error', (error) => {
                reject(error);
            })
        });

        post.write(json);
        post.end();
    });
}


let projectData = {
    'name' : structure['project']['name'],
    'body': structure['project']['body']
}
call(`/repos/${destination}/projects`, projectData)
.then((res) => {
    console.log(`Created project: ${res.html_url}`)
    return res;
}).then((project) => {
    function processColumns(columns) {
        var index = 0;
        function next() {
            if (index < columns.length) {
                let column = columns[index++];
                call(
                    `/projects/${project.id}/columns`,
                    {'name' : column['name']}
                ).then((res) => {
                    for (let card of column['cards']) {
                        return call(
                            `/projects/columns/${res.id}/cards`,
                            {'note': card}
                        )
                    }
                }).then(next)
            }
        }
        next();
    }
    processColumns(structure['columns'])
})
