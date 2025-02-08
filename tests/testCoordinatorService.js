/**
 * This class helps coordinate the testing
 */
class TestCoordinatorService {
  static tests = [];

  static runTests() {
    let errors = [];
    for(const test of TestCoordinatorService.tests) {
      try {
        test();
      } catch(e) {
        errors.push(e);
      }
    }

    if(errors.length === 0) {
      console.log(`%c All ${TestCoordinatorService.tests.length} tests passed`, 'background: green');
    } else {
      console.log(`%c ${errors.length}/${TestCoordinatorService.tests.length} tests failed`, 'background: red');
      for(const error of errors) {
        console.error(error);
      }
    }
  }

  static throwsError(test) {
    try {
      test();
    } catch(e) {
      return true;
    }
    return false;
  }

  static addTest(test) {
    TestCoordinatorService.tests.push(test);
  }
}