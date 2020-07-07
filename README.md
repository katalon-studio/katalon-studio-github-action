# Katalon Studio action test

This action allows you to run KS test and with your test cases source codes. 

## Inputs

Input your katalon studio version number, katalon command, and apiKey

**Required** the katalon studio version number, katalon commands, apikey and test cases files 


This is the example to using github action. <br>
Please change to the latest github action version and your Input. <br>

Setup API Key using Secret name: API_KEY


## Example usage
```yaml
name: CI
on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]

jobs:
  build:
    runs-on: windows-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v2
    - name: Katalon Studio Github Action
      uses: katalon-studio/katalon-studio-github-action@master
      with:
          version: '7.5.5'
          projectPath: '${{ github.workspace }}'
          args: '-noSplash -retry=0 -testSuiteCollectionPath="Test Suites/Simple Test Suite Collection" -apiKey= ${{ secrets.API_KEY }} --config -webui.autoUpdateDrivers=true'
```
