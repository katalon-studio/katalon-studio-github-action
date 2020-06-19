# Katalon Studio action test

This action allows you to run KS test and with your test cases source codes. 

## Inputs

Input your katalon studio version number, katalon command, and apiKey

**Required** the katalon studio version number, katalon commands , apikey and test cases files 


This is the example to using github action <br>
Please change to the latest github action version and your Input. <br>

Setup API Key using Secret name :  API_KEY


## Example usage
```yaml
jobs:
  build:
    runs-on: windows-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v2
    # Runs Katalon Studio Action
    - name: Katalon Studio Github Action
      uses: atluu315/Katalon_Studio_Github_Action@1.2
      with:
          version: '7.5.5'
          projectPath: '${{ github.workspace }}\<project name>.prj'
          args: '-noSplash -retry=0 -testSuiteCollectionPath="Test Suites/Run All Test Suites" -apiKey= ${{ secrets.API_KEY }} --config -proxy.auth.option=NO_PROXY -proxy.system.option=NO_PROXY'
```
