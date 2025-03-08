from flask import Flask, send_from_directory, abort
import os

app = Flask(__name__, static_folder='.')

@app.route('/')
def home():
    return app.send_static_file('index.html')

@app.route('/definitions.json')
def definitions():
    # Always serve the definitions.json file from the root directory
    return app.send_static_file('definitions.json')

@app.route('/<path:filename>')
def static_files(filename):
    try:
        return app.send_static_file(filename)
    except:
        return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(debug=False)
