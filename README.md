# Katalon Studio action test

This action to run KS test and with your test cases source codes. 

## Inputs

Input your katalon command and apiKey
refer to more information for using command from https://docs.katalon.com/

**Required** the katalon commands , apikey and test cases files 


This is the example to using github action <br>
Please change to the latest github action version and your Input. <br>

Setup API Key using Secret name :  KATALON_API_NAME

Katalon Github Action Marketplace link :  https://github.com/marketplace/actions/katalon-studio



## Example usage
```yaml
on: [push]

jobs:
  katalon_test_job:
    runs-on: ubuntu-latest
    name: Run katalon Studio Test CLI
    steps:
    # To use this repository's private action, you must check out the repository
    - name: Checkout
      uses: actions/checkout@v1
    - uses: ./ # Uses an action in the root directory
    - name: Get and run action
      uses: katalon-studio/katalon-studio-github-action@0.9
      with:
        katalon_api_key: ${{ secrets.KATALON_API_KEY }}
        Katalon_command: "katalon-execute.sh -browserType=Chrome -retry=0 -statusDelay=15 -testSuitePath=Test Suites/TS_RegressionTest"
```
