# Katalon Studio action test

This action allows you to run KS test and with your test cases source codes.

## Example usage

Setup API Key using Secret name: `API_KEY`.

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
      uses: katalon-studio/katalon-studio-github-action@v2
      with:
          version: '7.5.5'
          projectPath: '${{ github.workspace }}'
          args: '-noSplash -retry=0 -testSuiteCollectionPath="Test Suites/Simple Test Suite Collection" -apiKey= ${{ secrets.API_KEY }} --config -webui.autoUpdateDrivers=true'
```
