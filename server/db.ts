export const db: any = {
    select() {
        return {
              from() {
                      return {
                                where() {
                                            return [];
                                                      },
                                                                orderBy() {
                                                                            return [];
                                                                                      }
                                                                                              };
                                                                                                    }
                                                                                                        };
                                                                                                          },

                                                                                                            insert() {
                                                                                                                return {
                                                                                                                      values() {
                                                                                                                              return {
                                                                                                                                        returning() {
                                                                                                                                                    return [];
                                                                                                                                                              }
                                                                                                                                                                      };
                                                                                                                                                                            }
                                                                                                                                                                                };
                                                                                                                                                                                  },

                                                                                                                                                                                    update() {
                                                                                                                                                                                        return {
                                                                                                                                                                                              set() {
                                                                                                                                                                                                      return {
                                                                                                                                                                                                                where() {
                                                                                                                                                                                                                            return {
                                                                                                                                                                                                                                          returning() {
                                                                                                                                                                                                                                                          return [];
                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                                    };
                                                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                                                      };
                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                                };
                                                                                                                                                                                                                                                                                                                  },

                                                                                                                                                                                                                                                                                                                    delete() {
                                                                                                                                                                                                                                                                                                                        return {
                                                                                                                                                                                                                                                                                                                              where() {
                                                                                                                                                                                                                                                                                                                                      return [];
                                                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                                                                };
                                                                                                                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                                                                                                                  };
}