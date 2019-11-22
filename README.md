# Katalon Studio action test

This action to run KS test and with your test cases source codes. 

## Inputs

### `your katalon command `

**Required** the katalon commands and test cases files 

## Outputs

### `status`

done

## Example usage

uses: actions/katalonstudion@v1 <br/>
with:<br/>
  ks_command: '-browserType="Chrome" -retry=0 -statusDelay=15 -testSuitePath="Test Suites/TS_RegressionTest"'